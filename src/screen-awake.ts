export type ScreenLease = { release(): Promise<void> };
// Serialize acquisitions; retain a failed release for the next cleanup attempt.
export class ScreenAwakeLease {
  private queue = Promise.resolve();
  private epoch = 0;
  private lease?: ScreenLease;
  constructor(
    private request: () => Promise<ScreenLease>,
    private status: (s: "on" | "off" | "unavailable") => void = () => {},
  ) {}
  set(active: boolean) {
    const epoch = ++this.epoch;
    this.queue = this.queue
      .catch(() => {})
      .then(async () => {
        try {
          if (this.lease) {
            await this.lease.release();
            this.lease = undefined;
          }
          if (epoch !== this.epoch) return;
          if (!active) {
            this.status("off");
            return;
          }
          const lease = await this.request();
          this.lease = lease;
          if (epoch !== this.epoch) {
            await lease.release();
            this.lease = undefined;
            return;
          }
          this.status("on");
        } catch {
          if (epoch === this.epoch) this.status("unavailable");
        }
      });
    return this.queue;
  }
}
