import { randomUUID } from "node:crypto";
export type EmailEnvelope = {
  from: string;
  to: string[];
  subject: string;
  text: string;
};
export class EmailFailure extends Error {
  constructor(
    readonly retryable: boolean,
    readonly code = "temporary",
    readonly retryAfterMs = 0,
  ) {
    super("Email operation failed");
  }
}
export interface EmailAdapter {
  mode: "disabled" | "mock" | "resend";
  sender: string;
  send(
    envelope: EmailEnvelope,
    idempotencyKey: string,
  ): Promise<{ id: string }>;
  status(id: string): Promise<"pending" | "delivered" | "failed">;
}
const email = (v: string) =>
  typeof v === "string" &&
  v.length <= 254 &&
  /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v);
const uuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
export class MockEmailAdapter implements EmailAdapter {
  readonly mode = "mock" as const;
  readonly sender = "orders@example.invalid";
  private messages = new Map<string, { id: string; payload: string }>();
  async send(envelope: EmailEnvelope, key: string) {
    const payload = JSON.stringify(envelope),
      old = this.messages.get(key);
    if (old && old.payload !== payload)
      throw new EmailFailure(false, "payload-changed");
    if (old) return { id: old.id };
    const id = randomUUID();
    this.messages.set(key, { id, payload });
    return { id };
  }
  async status(id: string): Promise<"delivered"> {
    if (![...this.messages.values()].some((m) => m.id === id))
      throw new EmailFailure(false, "missing");
    return "delivered";
  }
}
export class ResendEmailAdapter implements EmailAdapter {
  readonly mode = "resend" as const;
  private origin: string;
  constructor(
    private key: string,
    readonly sender: string,
    test?: { origin: string; allowLocalTest: true },
  ) {
    if (
      typeof key !== "string" ||
      key.length < 20 ||
      key.length > 300 ||
      /\s/.test(key) ||
      !email(sender)
    )
      throw Error("Invalid transactional email configuration");
    this.origin = "https://api.resend.com";
    if (test) {
      const u = new URL(test.origin);
      if (
        test.allowLocalTest !== true ||
        u.protocol !== "http:" ||
        u.hostname !== "127.0.0.1" ||
        !u.port ||
        u.pathname !== "/" ||
        u.username ||
        u.password ||
        u.search ||
        u.hash
      )
        throw Error("Email test origin must be explicit loopback");
      this.origin = u.origin;
    }
  }
  private async request(
    path: string,
    body?: EmailEnvelope,
    key?: string,
  ): Promise<Record<string, unknown>> {
    try {
      const r = await fetch(this.origin + path, {
        method: body ? "POST" : "GET",
        headers: {
          Authorization: "Bearer " + this.key,
          ...(body
            ? { "Content-Type": "application/json", "Idempotency-Key": key! }
            : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) {
        await r.body?.cancel();
        const after = Number(r.headers.get("retry-after"));
        throw new EmailFailure(
          r.status === 429 || r.status >= 500,
          "provider-" + r.status,
          Number.isFinite(after)
            ? Math.max(0, Math.min(3600000, after * 1000))
            : 0,
        );
      }
      const reader = r.body?.getReader();
      if (!reader) throw new EmailFailure(true, "bad-response");
      let size = 0;
      const chunks: Uint8Array[] = [];
      for (;;) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.length;
        if (size > 65536) {
          await reader.cancel();
          throw new EmailFailure(false, "response-limit");
        }
        chunks.push(part.value);
      }
      const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new EmailFailure(false, "bad-response");
      return value;
    } catch (e) {
      if (e instanceof EmailFailure) throw e;
      throw new EmailFailure(true);
    }
  }
  async send(envelope: EmailEnvelope, key: string) {
    if (
      envelope.from !== this.sender ||
      !Array.isArray(envelope.to) ||
      envelope.to.length !== 1 ||
      !email(envelope.to[0]) ||
      typeof envelope.subject !== "string" ||
      !envelope.subject ||
      envelope.subject.length > 200 ||
      /[\r\n]/.test(envelope.subject) ||
      typeof envelope.text !== "string" ||
      envelope.text.length > 4000 ||
      typeof key !== "string" ||
      !/^iprasm-outbox\/[a-f0-9-]{36}$/.test(key)
    )
      throw new EmailFailure(false, "invalid-envelope");
    const value = await this.request("/emails", envelope, key);
    if (!uuid(value.id)) throw new EmailFailure(true, "bad-response");
    return { id: value.id };
  }
  async status(id: string): Promise<"pending" | "delivered" | "failed"> {
    if (!uuid(id)) throw new EmailFailure(false, "invalid-provider-id");
    const v = await this.request("/emails/" + id);
    if (v.id !== id || typeof v.last_event !== "string")
      throw new EmailFailure(true, "bad-response");
    if (["delivered", "opened", "clicked"].includes(v.last_event))
      return "delivered";
    if (
      ["bounced", "failed", "suppressed", "canceled", "complained"].includes(
        v.last_event,
      )
    )
      return "failed";
    return "pending";
  }
}
export function emailAdapter(env: NodeJS.ProcessEnv): EmailAdapter {
  const mode = env.TRANSACTIONAL_EMAIL_MODE ?? "disabled";
  if (mode === "disabled")
    return {
      mode: "disabled",
      sender: "",
      send: async () => {
        throw new EmailFailure(false, "disabled");
      },
      status: async () => {
        throw new EmailFailure(false, "disabled");
      },
    };
  if (mode === "mock") {
    if (env.NODE_ENV === "production" || env.IP_RASM_TEST_SERVER !== "1")
      throw Error("Mock email is isolated-test only");
    return new MockEmailAdapter();
  }
  if (mode === "resend") {
    if (env.IP_RASM_TEST_SERVER === "1")
      throw Error("Real email is forbidden in isolated test servers");
    return new ResendEmailAdapter(
      env.RESEND_API_KEY ?? "",
      env.TRANSACTIONAL_EMAIL_FROM ?? "",
    );
  }
  throw Error("Unsupported transactional email mode");
}
