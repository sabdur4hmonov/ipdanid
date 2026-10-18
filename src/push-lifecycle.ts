export type PushIdentity = {
  installationId: string;
  installationSecret: string;
};
export interface PushDriver {
  platform: "web" | "android" | "ios";
  permission(): Promise<boolean>;
  token(): Promise<string>;
  removeToken(): Promise<void>;
  listen(token: () => void, message: () => void): Promise<() => Promise<void>>;
}
export interface PushPorts {
  identity(): Promise<PushIdentity>;
  account(): string | undefined;
  register(
    body: PushIdentity & {
      token: string;
      platform: string;
      locale: string;
      promotions: boolean;
      consent: true;
    },
  ): Promise<unknown>;
  revoke(body: PushIdentity): Promise<unknown>;
  driver(): Promise<PushDriver>;
  save(enabled: boolean): Promise<void>;
  cleanup?(): Promise<void>;
  message(): void;
}
// Serial operations and an epoch fence prevent an old permission/token response
// from registering a device after logout, a preference change, or a new login.
export class PushLifecycle {
  enabled = false;
  private epoch = 0;
  private work: Promise<unknown> = Promise.resolve();
  private driver?: PushDriver;
  private unlisten?: () => Promise<void>;
  private preferences = { locale: "uz", promotions: false };
  constructor(private ports: PushPorts) {}
  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.work.catch(() => {}).then(fn);
    this.work = next;
    return next;
  }
  async enable(locale: string, promotions: boolean, ask = true) {
    const epoch = ++this.epoch,
      account = this.ports.account();
    if (!account) throw Error("account");
    this.preferences = { locale, promotions };
    return this.serial(async () => {
      const current = () =>
        epoch === this.epoch && account === this.ports.account();
      if (!current()) return;
      const driver = (this.driver ??= await this.ports.driver());
      if (!current()) return;
      if (ask && !(await driver.permission())) throw Error("permission");
      if (!current()) return;
      const identity = await this.ports.identity();
      let token: string;
      try {
        token = await driver.token();
      } catch (error) {
        if (error instanceof Error && error.message === "permission") {
          this.enabled = false;
          await this.ports.save(false);
          await this.ports.revoke(identity);
          await driver.removeToken();
        }
        throw error;
      }
      if (!current()) {
        await driver.removeToken();
        return;
      }
      try {
        await this.ports.register({
          ...identity,
          token,
          platform: driver.platform,
          locale,
          promotions,
          consent: true,
        });
      } catch (error) {
        if (!this.enabled) await driver.removeToken().catch(() => {});
        throw error;
      }
      if (!current()) {
        await this.ports.revoke(identity);
        await driver.removeToken();
        return;
      }
      this.enabled = true;
      await this.ports.save(true);
      if (!this.unlisten)
        this.unlisten = await driver.listen(
          () => {
            void this.refresh().catch(() => {});
          },
          () => this.ports.message(),
        );
    });
  }
  refresh() {
    return this.enabled
      ? this.enable(this.preferences.locale, this.preferences.promotions, false)
      : Promise.resolve();
  }
  async disable() {
    ++this.epoch;
    this.enabled = false;
    // Persist revocation intent first: offline/app restart must never auto-opt-in.
    await this.ports.save(false);
    return this.serial(async () => {
      let failure: unknown;
      try {
        await this.ports.revoke(await this.ports.identity());
      } catch (e) {
        failure = e;
      }
      try {
        await this.unlisten?.();
        if (this.driver) await this.driver.removeToken();
        else await this.ports.cleanup?.();
      } finally {
        this.unlisten = undefined;
      }
      if (failure) throw failure;
    });
  }
}
