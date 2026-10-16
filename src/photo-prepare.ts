import type { PersonMask } from "./core/person-mask";
import type { SourceFace } from "./core/face-features";
export type PhotoAnalysis = {
  mask: PersonMask;
  faces: SourceFace[];
  faceUnavailable: boolean;
  cleanupUnavailable: boolean;
  analysisTurn?: import("./core/photo-orientation").QuarterTurn;
};
let worker: Worker | undefined,
  id = 0;
const pending = new Map<
  number,
  { resolve: (result: PhotoAnalysis) => void; reject: (e: Error) => void }
>();
function getWorker() {
  if (!worker) {
    // This pinned WASM runtime needs a classic worker, including in Vite dev mode.
    worker = import.meta.env.DEV
      ? new Worker("/photo-prepare-dev.worker.js")
      : new Worker(new URL("./photo-prepare.worker.ts", import.meta.url));
    worker.onmessage = (e) => {
      const job = pending.get(e.data.id);
      if (!job) return;
      pending.delete(e.data.id);
      if (e.data.error) job.reject(Error(e.data.error));
      else job.resolve(e.data);
    };
    worker.onerror = () => {
      worker?.terminate();
      worker = undefined;
      for (const job of pending.values())
        job.reject(Error("Local photo worker unavailable"));
      pending.clear();
    };
  }
  return worker;
}
/**
 * Session teardown: lets the worker close the cached face model before exit.
 * Superseded jobs still terminate an idle worker immediately (see abort below).
 */
export function disposePhotoAnalysis() {
  const w = worker;
  worker = undefined;
  if (!w) return;
  for (const job of pending.values())
    job.reject(new DOMException("Photo analysis closed", "AbortError"));
  pending.clear();
  w.postMessage({ id: 0, dispose: true });
}
if (typeof window !== "undefined")
  window.addEventListener("pagehide", (e) => {
    if (!e.persisted) disposePhotoAnalysis();
  });
async function preparePersonPhotoOnce(
  source: HTMLCanvasElement,
  signal: AbortSignal,
): Promise<PhotoAnalysis> {
  const bitmap = await createImageBitmap(source);
  if (signal.aborted) {
    bitmap.close();
    throw new DOMException("Superseded photo", "AbortError");
  }
  const task = ++id,
    w = getWorker();
  return new Promise((resolve, reject) => {
    const abort = () => {
      pending.delete(task);
      if (!pending.size && worker === w) {
        w.terminate();
        worker = undefined;
      } else w.postMessage({ id: task, cancel: true });
      reject(new DOMException("Superseded photo", "AbortError"));
    };
    signal.addEventListener("abort", abort, { once: true });
    pending.set(task, {
      resolve: (r) => {
        signal.removeEventListener("abort", abort);
        resolve(r);
      },
      reject: (e) => {
        signal.removeEventListener("abort", abort);
        reject(e);
      },
    });
    try {
      w.postMessage({ id: task, image: bitmap }, [bitmap]);
    } catch (error) {
      pending.delete(task);
      signal.removeEventListener("abort", abort);
      bitmap.close();
      reject(error);
    }
  });
}

// A worker may fail during local WASM startup (observed on mobile Chromium).
// Retry only that infrastructure failure once; never invent a face/mask or
// restart an aborted/superseded photo. Semantic/model errors remain explicit.
export async function preparePersonPhoto(
  source: HTMLCanvasElement,
  signal: AbortSignal,
): Promise<PhotoAnalysis> {
  try {
    return await preparePersonPhotoOnce(source, signal);
  } catch (error) {
    if (
      signal.aborted ||
      !(error instanceof Error) ||
      error.message !== "Local photo worker unavailable"
    )
      throw error;
    return preparePersonPhotoOnce(source, signal);
  }
}
