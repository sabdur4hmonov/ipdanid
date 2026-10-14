import type { VoiceClip } from "./core/recorded-voices";
import { hash } from "./core/engine";
export class RecordedClipPlayer {
  private context: AudioContext | undefined;
  private serial = 0;
  private sources: AudioBufferSourceNode[] = [];
  private abort: AbortController | undefined;
  private completion: ((played: boolean) => void) | undefined;
  private cache = new Map<string, AudioBuffer>();
  private cacheBytes = 0;
  stop() {
    this.serial++;
    this.abort?.abort();
    this.abort = undefined;
    for (const source of this.sources)
      try {
        source.stop();
      } catch {}
    this.sources = [];
    this.completion?.(false);
    this.completion = undefined;
  }
  async play(clips: VoiceClip[], rate: number) {
    this.stop();
    const job = this.serial;
    if (
      !clips.length ||
      clips.length > 32 ||
      !Number.isFinite(rate) ||
      rate < 0.5 ||
      rate > 2
    )
      throw Error("Invalid recorded playback");
    this.context ??= new AudioContext();
    const context = this.context;
    await context.resume();
    if (job !== this.serial) return false;
    const abort = new AbortController();
    this.abort = abort;
    try {
      const buffers: AudioBuffer[] = [];
      for (const c of clips) {
        if (job !== this.serial) return false;
        let buffer = this.cache.get(c.sha256);
        if (!buffer) {
          if (
            !/^\/voices\/(uz|ru|en)\/instructor-[ab]\/[a-z0-9-]+\.wav$/.test(
              c.path,
            )
          )
            throw Error("Invalid recorded clip path");
          const r = await fetch(c.path, { signal: abort.signal });
          if (!r.ok) throw Error("Recorded clip unavailable");
          const bytes = new Uint8Array(await r.arrayBuffer());
          if (bytes.length !== c.bytes || (await hash(bytes)) !== c.sha256)
            throw Error("Recorded clip integrity mismatch");
          buffer = await context.decodeAudioData(new Uint8Array(bytes).buffer);
          if (
            buffer.numberOfChannels !== 1 ||
            Math.abs(buffer.duration * 1000 - c.durationMs) > 100 ||
            !Number.isFinite(buffer.duration) ||
            buffer.duration <= 0
          )
            throw Error("Invalid recorded clip duration");
          const size = buffer.length * 4;
          if (size > 64 * 1024 * 1024)
            throw Error("Recorded clip memory limit");
          while (this.cacheBytes + size > 64 * 1024 * 1024 && this.cache.size) {
            const first = this.cache.keys().next().value!,
              old = this.cache.get(first)!;
            this.cache.delete(first);
            this.cacheBytes -= old.length * 4;
          }
          this.cache.set(c.sha256, buffer);
          this.cacheBytes += size;
        }
        buffers.push(buffer);
      }
      if (job !== this.serial) return false;
      return await new Promise<boolean>((resolve) => {
        this.completion = resolve;
        let when = context.currentTime + 0.025;
        this.sources = [];
        for (const buffer of buffers) {
          const source = context.createBufferSource();
          this.sources.push(source);
          source.buffer = buffer;
          source.playbackRate.value = rate;
          source.connect(context.destination);
          source.start(when);
          when += buffer.duration / rate + 0.035;
        }
        this.sources.at(-1)!.onended = () => {
          if (job === this.serial) {
            this.sources = [];
            this.completion = undefined;
            resolve(true);
          }
        };
      });
    } catch (e) {
      if (job !== this.serial) return false;
      this.stop();
      throw e;
    }
  }
}
export const recordedClipPlayer = new RecordedClipPlayer();
