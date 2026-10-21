import type { AnalyticsEvent, AnalyticsPreferences } from "./analytics-types";
type PhotoInput = { kind: "photo-selected" | "preview-ready"; shape: unknown };
type ManualInput = {
  kind: "assembly-confirmed";
  sequenceHash: string;
  revision: number;
  confirmed: number;
  total: number;
};
export interface AnalyticsTransport {
  identity(): string | null;
  preferences(token: string): Promise<AnalyticsPreferences>;
  guides(token: string): Promise<string[]>;
  send(event: AnalyticsEvent, token: string): Promise<unknown>;
}
type Queued = {
  event: AnalyticsEvent;
  token: string;
  epoch: number;
  attempts: number;
};
// Optional online telemetry only. No disk queue, source pixels, filenames,
// caption/support text, account creation or pre-consent collection.
export class AnalyticsDriver {
  private epoch = 0;
  private token: string | null = null;
  private choice: AnalyticsPreferences | undefined;
  private owned = new Set<string>();
  private unavailable = new Set<string>();
  private samples = new Map<string, number>();
  private queue: Queued[] = [];
  private running: Promise<void> | undefined;
  constructor(
    private transport: AnalyticsTransport,
    private key = () => crypto.randomUUID(),
  ) {}
  pause() {
    ++this.epoch;
    this.token = null;
    this.choice = undefined;
    this.owned.clear();
    this.unavailable.clear();
    this.samples.clear();
    this.queue = [];
  }
  private valid(token: string, epoch: number) {
    return (
      token === this.token &&
      token === this.transport.identity() &&
      epoch === this.epoch &&
      this.choice?.enabled === true
    );
  }
  async refresh() {
    this.pause();
    const token = this.transport.identity(),
      epoch = this.epoch;
    if (!token) return;
    this.token = token;
    try {
      const choice = await this.transport.preferences(token);
      if (token !== this.transport.identity() || epoch !== this.epoch) return;
      this.apply(choice, token);
      await this.refreshGuides();
    } catch {
      /* Optional collection stays off; local creation/assembly is unaffected. */
    }
  }
  apply(choice: AnalyticsPreferences, token: string) {
    if (token !== this.transport.identity()) return;
    this.pause();
    this.token = token;
    if (
      typeof choice?.enabled === "boolean" &&
      Number.isSafeInteger(choice.revision) &&
      choice.revision >= 0 &&
      choice.retentionDays === 90 &&
      (!choice.enabled ||
        (choice.revision > 0 &&
          Number.isSafeInteger(choice.since) &&
          Number(choice.since) >= 0))
    )
      this.choice = {
        revision: choice.revision,
        enabled: choice.enabled,
        since: choice.since,
        retentionDays: 90,
      };
  }
  async refreshGuides() {
    const token = this.token,
      epoch = this.epoch;
    if (!token || !this.valid(token, epoch)) return;
    try {
      const guides = await this.transport.guides(token);
      if (this.valid(token, epoch))
        this.owned = new Set(
          guides.filter((g) => /^[a-f0-9]{64}$/.test(g)).slice(0, 200),
        );
    } catch {
      /* Never guess ownership or send another account's local guide hash. */
    }
  }
  record(input: PhotoInput | ManualInput, forceCorrection = false) {
    const token = this.token,
      epoch = this.epoch;
    if (!token || !this.valid(token, epoch) || this.queue.length >= 20)
      return false;
    let event: AnalyticsEvent;
    if (input.kind === "photo-selected" || input.kind === "preview-ready") {
      const shape = input.shape === "rectangle" ? "square" : input.shape;
      if (
        typeof shape !== "string" ||
        !["circle", "square", "heart"].includes(shape)
      )
        return false;
      event = {
        requestKey: this.key(),
        consentRevision: this.choice!.revision,
        kind: input.kind,
        shape: shape as "circle" | "square" | "heart",
      };
    } else if (input.kind === "assembly-confirmed") {
      if (
        !this.owned.has(input.sequenceHash) ||
        !Number.isSafeInteger(input.revision) ||
        input.revision < 1 ||
        !Number.isSafeInteger(input.total) ||
        input.total < 1 ||
        input.total > 20000 ||
        !Number.isSafeInteger(input.confirmed) ||
        input.confirmed < 0 ||
        input.confirmed > input.total
      )
        return false;
      const bucket =
        input.confirmed === 0
          ? -1
          : input.confirmed === 1
            ? -2
            : Math.floor((input.confirmed * 10) / input.total);
      if (!forceCorrection && this.samples.get(input.sequenceHash) === bucket)
        return false;
      this.samples.set(input.sequenceHash, bucket);
      event = {
        requestKey: this.key(),
        consentRevision: this.choice!.revision,
        kind: "assembly-confirmed",
        sequenceHash: input.sequenceHash,
        revision: input.revision,
        confirmed: input.confirmed,
        total: input.total,
      };
    } else return false;
    this.queue.push({ event, token, epoch, attempts: 0 });
    void this.flush();
    return true;
  }
  capture() {
    const token = this.token,
      epoch = this.epoch;
    return (input: PhotoInput | ManualInput, correction = false) =>
      !!token && this.valid(token, epoch) && this.record(input, correction);
  }
  async manual(input: ManualInput, correction = false) {
    const token = this.token,
      epoch = this.epoch;
    if (!token || !this.valid(token, epoch)) return false;
    if (!this.owned.has(input.sequenceHash)) {
      if (this.unavailable.has(input.sequenceHash)) return false;
      await this.refreshGuides();
      if (!this.valid(token, epoch)) return false;
      if (!this.owned.has(input.sequenceHash)) {
        if (this.unavailable.size < 200)
          this.unavailable.add(input.sequenceHash);
        return false;
      }
    }
    return this.record(input, correction);
  }
  flush(): Promise<void> {
    if (!this.running)
      this.running = this.pump().finally(() => {
        this.running = undefined;
        if (this.queue.length) void this.flush();
      });
    return this.running;
  }
  private async pump() {
    while (this.queue.length) {
      const job = this.queue.shift()!;
      if (!this.valid(job.token, job.epoch)) continue;
      try {
        await this.transport.send(job.event, job.token);
      } catch (e) {
        if (!this.valid(job.token, job.epoch)) continue;
        const status = Number((e as { status?: unknown })?.status);
        if ([401, 403, 409].includes(status)) {
          this.pause();
          continue;
        }
        // At most one exact retry, only while the original live consent/account
        // still applies. No delayed/offline history is replayed after restart.
        if (!status && job.attempts === 0) {
          job.attempts++;
          this.queue.unshift(job);
        }
      }
    }
  }
}
