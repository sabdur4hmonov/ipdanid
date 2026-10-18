import type { Instruction } from "./core/types";
import { SequenceGif } from "./core/sequence-animation";
let active = false;
export const videoMime = () =>
  typeof MediaRecorder === "undefined" ||
  typeof MediaRecorder.isTypeSupported !== "function" ||
  typeof HTMLCanvasElement.prototype.captureStream !== "function"
    ? undefined
    : [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
        "video/mp4",
      ].find((t) => MediaRecorder.isTypeSupported(t));
export async function exportSequenceAnimation(
  guide: Instruction,
  canvas: HTMLCanvasElement,
  mode: "video" | "gif",
  signal: AbortSignal,
  progress: (n: number) => void,
) {
  if (active) throw Error("animation/busy");
  active = true;
  let worker: Worker | undefined,
    stream: MediaStream | undefined,
    recorder: MediaRecorder | undefined;
  const cancelled = () => {
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
  };
  const wait = (ms: number) =>
    new Promise<void>((resolve, reject) => {
      const done = () => {
          signal.removeEventListener("abort", abort);
          resolve();
        },
        timer = setTimeout(done, ms),
        abort = () => {
          clearTimeout(timer);
          signal.removeEventListener("abort", abort);
          reject(new DOMException("Cancelled", "AbortError"));
        };
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
  let pendingReject: ((e: Error) => void) | undefined;
  const abort = () =>
    pendingReject?.(new DOMException("Cancelled", "AbortError"));
  signal.addEventListener("abort", abort);
  const timeout = setTimeout(
      () => pendingReject?.(Error("animation/timeout")),
      45000,
    ),
    started = performance.now();
  try {
    cancelled();
    worker = new Worker(
      new URL("./sequence-animation.worker.ts", import.meta.url),
      { type: "module" },
    );
    const request = (message: object) =>
      new Promise<any>((resolve, reject) => {
        cancelled();
        pendingReject = reject;
        worker!.onerror = () => reject(Error("animation/worker"));
        worker!.onmessage = ({ data }) => {
          pendingReject = undefined;
          data.type === "error"
            ? reject(Error("animation/render"))
            : resolve(data);
        };
        worker!.postMessage(message);
      });
    const ready = await request({ type: "init", guide, mode });
    canvas.width = ready.width;
    canvas.height = ready.height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = guide.profile.baseColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const mime = mode === "video" ? videoMime() : undefined;
    if (mode === "video" && !mime) throw Error("animation/codec");
    const chunks: Blob[] = [];
    let size = 0,
      failure: Error | undefined,
      ending: Promise<Blob> | undefined;
    if (mime) {
      stream = canvas.captureStream(0);
      recorder = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: 8_000_000,
      });
      ending = new Promise<Blob>((resolve, reject) => {
        recorder!.ondataavailable = ({ data }) => {
          size += data.size;
          if (size > 50 * 1024 * 1024) {
            failure = Error("animation/size");
            if (recorder!.state !== "inactive") recorder!.stop();
          } else if (data.size) chunks.push(data);
        };
        recorder!.onerror = () => {
          failure = Error("animation/codec");
          reject(failure);
        };
        recorder!.onstop = () =>
          failure
            ? reject(failure)
            : resolve(new Blob(chunks, { type: recorder!.mimeType }));
      });
      void ending.catch(() => {});
      recorder.start(500);
    }
    const gray = [guide.profile.baseColor, ...guide.profile.colors].every(
      (c) => c.slice(1, 3) === c.slice(3, 5) && c.slice(3, 5) === c.slice(5, 7),
    );
    const gif =
        mode === "gif"
          ? new SequenceGif(ready.thumbnailWidth, ready.thumbnailHeight, gray)
          : undefined,
      interval = 6000 / (ready.steps.length - 1);
    for (let index = 0; index < ready.steps.length; index++) {
      cancelled();
      if (failure) throw failure;
      if (performance.now() - started > 45000) throw Error("animation/timeout");
      const frame = await request({ type: "frame", index });
      cancelled();
      ctx.putImageData(
        new ImageData(frame.rgba, ready.width, ready.height),
        0,
        0,
      );
      canvas.dataset.animationCompleted = String(frame.completed);
      if (gif) {
        gif.add(
          frame.thumbnail,
          index === ready.steps.length - 1
            ? 100
            : Math.max(1, Math.round(interval / 10)),
        );
      } else {
        const track =
          stream!.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
        if (typeof track.requestFrame !== "function")
          throw Error("animation/codec");
        track.requestFrame();
        await wait(index === ready.steps.length - 1 ? 800 : interval);
      }
      progress((index + 1) / ready.steps.length);
    }
    cancelled();
    if (recorder) {
      if (recorder.state === "inactive")
        throw failure ?? Error("animation/codec");
      recorder.stop();
      const blob = await new Promise<Blob>((resolve, reject) => {
        pendingReject = reject;
        ending!.then(resolve, reject);
      });
      cancelled();
      if (!blob.size) throw Error("animation/empty");
      return { blob, extension: blob.type.includes("mp4") ? "mp4" : "webm" };
    }
    return { blob: gif!.finish(), extension: "gif" };
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", abort);
    worker?.terminate();
    if (recorder && recorder.state !== "inactive") recorder.stop();
    stream?.getTracks().forEach((t) => t.stop());
    active = false;
  }
}
