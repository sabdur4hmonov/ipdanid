import type { AssemblyAudioProgram } from "./assembly-audio-program";
export type AssemblyAudioSnapshot = {
  version: "assembly-audio-state/1";
  session: string;
  sequenceHash: string;
  current: number;
  total: number;
  revision: number;
  active: boolean;
  playing: boolean;
  error: string;
};
export type AudioCommand = "play" | "pause" | "next" | "previous";
export interface AssemblyAudioAdapter {
  capabilities(): Promise<{ supported: boolean }>;
  start(o: {
    controller: string;
    requestId: number;
    program: AssemblyAudioProgram;
  }): Promise<AssemblyAudioSnapshot>;
  command(o: {
    controller: string;
    requestId: number;
    session: string;
    sequenceHash: string;
    command: AudioCommand;
  }): Promise<AssemblyAudioSnapshot>;
  stop(o: { controller: string; requestId: number }): Promise<void>;
  status(): Promise<AssemblyAudioSnapshot>;
}
/** Announced position only. This class has no progress, credit or analytics writer. */
export class AssemblyAudioDriver {
  private readonly controller = crypto.randomUUID();
  private requestId = 0;
  private program: AssemblyAudioProgram | undefined;
  private revision = -1;
  constructor(
    private adapter: AssemblyAudioAdapter,
    private changed: (state: AssemblyAudioSnapshot) => void,
    private failed: () => void,
  ) {}
  get ownsSession() {
    return !!this.program;
  }
  async start(program: AssemblyAudioProgram) {
    this.program = program;
    this.revision = -1;
    const requestId = ++this.requestId;
    try {
      const result = await this.adapter.start({
        controller: this.controller,
        requestId,
        program,
      });
      if (this.program === program) {
        if (!this.accept(result) && this.revision < 0) {
          await this.stop();
          this.failed();
        }
      }
    } catch {
      if (this.program === program && requestId === this.requestId) {
        await this.stop();
        this.failed();
      }
    }
  }
  accept(s: AssemblyAudioSnapshot) {
    const p = this.program;
    if (
      !p ||
      !s ||
      s.version !== "assembly-audio-state/1" ||
      s.session !== p.session ||
      s.sequenceHash !== p.sequenceHash ||
      s.total !== p.steps.length ||
      !Number.isInteger(s.current) ||
      s.current < 1 ||
      s.current > s.total ||
      !Number.isSafeInteger(s.revision) ||
      s.revision <= this.revision ||
      typeof s.active !== "boolean" ||
      typeof s.playing !== "boolean" ||
      (!s.active && s.playing) ||
      typeof s.error !== "string" ||
      s.error.length > 64
    )
      return false;
    this.revision = s.revision;
    if (!s.active) this.program = undefined;
    this.changed({
      version: s.version,
      session: s.session,
      sequenceHash: s.sequenceHash,
      current: s.current,
      total: s.total,
      revision: s.revision,
      active: s.active,
      playing: s.playing,
      error: s.error,
    });
    return true;
  }
  async command(command: AudioCommand) {
    const p = this.program;
    if (!p) return;
    const requestId = ++this.requestId;
    try {
      const result = await this.adapter.command({
        controller: this.controller,
        requestId,
        session: p.session,
        sequenceHash: p.sequenceHash,
        command,
      });
      if (this.program === p) this.accept(result);
    } catch {
      if (this.program === p && requestId === this.requestId) {
        await this.stop();
        this.failed();
      }
    }
  }
  async refresh() {
    const p = this.program;
    if (!p) return;
    try {
      const result = await this.adapter.status();
      if (this.program === p) {
        if (
          !result ||
          result.session !== p.session ||
          result.sequenceHash !== p.sequenceHash
        ) {
          await this.stop();
          this.failed();
        } else this.accept(result);
      }
    } catch {
      if (this.program === p) {
        await this.stop();
        this.failed();
      }
    }
  }
  async stop() {
    this.program = undefined;
    this.revision = -1;
    try {
      await this.adapter.stop({
        controller: this.controller,
        requestId: ++this.requestId,
      });
    } catch {
      this.failed();
    }
  }
}
