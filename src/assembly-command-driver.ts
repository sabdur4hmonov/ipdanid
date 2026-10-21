import {
  commandScopeKey,
  recognizedAssemblyCommand,
  type AssemblyCommand,
  type CommandLanguage,
  type CommandScope,
} from "./assembly-command-policy";
export type CommandState =
  "off" | "permission" | "preparing" | "listening" | "heard" | "manual";
export interface AssemblyCommandAdapter {
  capabilities(): Promise<{ supported: boolean }>;
  permission(o: {
    controller: string;
    requestId: number;
  }): Promise<{ granted: boolean }>;
  listen(o: {
    controller: string;
    requestId: number;
    session: string;
    language: CommandLanguage;
  }): Promise<{ session: string; status: string; alternatives: unknown }>;
  cancel(o: { controller: string; requestId: number }): Promise<void>;
}
export class AssemblyCommandDriver {
  private readonly controller = crypto.randomUUID();
  private epoch = 0;
  private requestId = 0;
  private inFlight = false;
  private capture?: { session: string; key: string; ticket: number };
  constructor(
    private adapter: AssemblyCommandAdapter,
    private scope: () => CommandScope | undefined,
    private dispatch: (command: AssemblyCommand) => void,
    private state: (s: CommandState, command?: AssemblyCommand) => void,
    private clock = () => performance.now(),
  ) {}
  cancel() {
    this.epoch++;
    this.capture = undefined;
    if (this.inFlight) {
      this.inFlight = false;
      void this.adapter
        .cancel({ controller: this.controller, requestId: ++this.requestId })
        .catch(() => {});
    }
    this.state("off");
  }
  ready(session: string) {
    const c = this.capture;
    if (
      c &&
      c.session === session &&
      c.ticket === this.epoch &&
      c.key === commandScopeKey(this.scope())
    )
      this.state("listening");
  }
  async listen() {
    this.cancel();
    const scope = this.scope(),
      key = commandScopeKey(scope);
    if (!scope || !key) {
      this.state("manual");
      return;
    }
    const ticket = ++this.epoch,
      session = crypto.randomUUID(),
      began = this.clock();
    this.inFlight = true;
    const valid = () =>
      ticket === this.epoch && key === commandScopeKey(this.scope());
    const manual = () => {
      if (ticket === this.epoch) {
        this.capture = undefined;
        this.inFlight = false;
        void this.adapter
          .cancel({ controller: this.controller, requestId: ++this.requestId })
          .catch(() => {});
        this.state("manual");
      }
    };
    const stale = () => {
      if (valid()) return false;
      if (ticket === this.epoch) this.cancel();
      return true;
    };
    try {
      const capabilities = await this.adapter.capabilities();
      if (stale()) return;
      if (!capabilities.supported || this.clock() - began > 30000) {
        manual();
        return;
      }
      this.state("permission");
      const permission = await this.adapter.permission({
        controller: this.controller,
        requestId: ++this.requestId,
      });
      if (stale()) return;
      if (!permission.granted || this.clock() - began > 30000) {
        manual();
        return;
      }
      this.state("preparing");
      const started = this.clock();
      this.capture = { session, key, ticket };
      const result = await this.adapter.listen({
        controller: this.controller,
        requestId: ++this.requestId,
        session,
        language: scope.language,
      });
      if (stale()) return;
      if (
        !result ||
        result.session !== session ||
        result.status !== "result" ||
        this.clock() - started > 10000
      ) {
        manual();
        return;
      }
      const command = recognizedAssemblyCommand(
        result.alternatives,
        scope.language,
      );
      if (
        !command ||
        (command === "next" && scope.current === scope.total) ||
        (command === "previous" && scope.current === 1)
      ) {
        manual();
        return;
      }
      this.inFlight = false;
      this.capture = undefined;
      await this.adapter.cancel({
        controller: this.controller,
        requestId: ++this.requestId,
      });
      if (!valid()) return;
      this.state("heard", command);
      this.dispatch(command);
    } catch {
      if (valid()) manual();
    } finally {
      if (ticket === this.epoch) {
        this.inFlight = false;
        this.capture = undefined;
      }
    }
  }
}
