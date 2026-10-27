import { customerApi } from "./customer-api";
import { hash } from "./core/engine";
import type { KitPreparation } from "./core/standard-preparation";
import type { Shape } from "./core/types";

export function resolveProtectedGenerationMode(value: unknown) {
  if (value === undefined || value === "" || value === "0") return false;
  if (value === "1") return true;
  throw Error("Invalid server generation configuration");
}
export const protectedGenerationMode = resolveProtectedGenerationMode(
  import.meta.env.VITE_SERVER_GENERATION,
);
export type GenerationJob = { id: string; secret: string };
export type ProtectedPreview = GenerationJob & {
  kind: "protected-generation";
  sequenceHash: string;
  lines: number;
  preview: string;
  expiresAt: number;
};
export type GenerationInput = {
  pixels: Uint8Array;
  shape: Shape;
  revision: number;
  lines: number;
  preparation: KitPreparation;
};
export type GenerationAttempt = {
  fingerprint: string;
  body: Record<string, unknown>;
  job?: GenerationJob;
};
export class GenerationFailure extends Error {
  constructor(readonly terminal: boolean) {
    super("generation/unavailable");
  }
}
function base64(bytes: Uint8Array, url = true) {
  const chunks: string[] = [];
  for (let at = 0; at < bytes.length; at += 16384)
    chunks.push(String.fromCharCode(...bytes.subarray(at, at + 16384)));
  const encoded = btoa(chunks.join(""));
  return url
    ? encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
    : encoded;
}
export async function generationAttempt(
  input: GenerationInput,
  previous?: GenerationAttempt,
): Promise<GenerationAttempt> {
  if (input.pixels.length !== 750000) throw new GenerationFailure(true);
  const mono = new Uint8Array(250000);
  for (let at = 0; at < mono.length; at++) {
    const r = input.pixels[at * 3];
    if (r !== input.pixels[at * 3 + 1] || r !== input.pixels[at * 3 + 2])
      throw new GenerationFailure(true);
    mono[at] = r;
  }
  const recipe = {
      version: "protected-generation/1",
      consent: "prepared-target-transfer/1",
      shape: input.shape,
      revision: input.revision,
      lines: input.lines,
      target: base64(mono),
      preparation: input.preparation,
    },
    fingerprint = await hash(recipe);
  if (previous?.fingerprint === fingerprint) return previous;
  return {
    fingerprint,
    body: {
      ...recipe,
      requestKey: crypto.randomUUID(),
      secret: base64(crypto.getRandomValues(new Uint8Array(32))),
    },
  };
}
export async function cancelGeneration(job: GenerationJob) {
  await customerApi.request("/generation/cancel", job, "");
}
export async function runProtectedGeneration(
  attempt: GenerationAttempt,
  callbacks: {
    cancelled: () => boolean;
    onJob: (job: GenerationJob) => void;
    onProgress: (fraction: number) => void;
  },
): Promise<ProtectedPreview> {
  const cancelled = async (job?: GenerationJob) => {
    if (!callbacks.cancelled()) return;
    if (job) void cancelGeneration(job).catch(() => {});
    throw new DOMException("Cancelled", "AbortError");
  };
  await cancelled();
  const config = await customerApi.request<any>(
    "/generation/config",
    undefined,
    "",
  );
  if (
    !config.enabled ||
    config.version !== "protected-generation/1" ||
    config.consent !== "prepared-target-transfer/1"
  )
    throw new GenerationFailure(true);
  await cancelled();
  const start =
    attempt.job ??
    (await customerApi.request<any>("/generation/start", attempt.body, ""));
  if (!/^[a-f0-9-]{36}$/.test(start.id)) throw new GenerationFailure(true);
  const job = { id: start.id as string, secret: String(attempt.body.secret) };
  attempt.job = job;
  await cancelled(job);
  callbacks.onJob(job);
  const began = performance.now();
  while (performance.now() - began < 100000) {
    await cancelled(job);
    const state = await customerApi.request<any>("/generation/status", job, "");
    await cancelled(job);
    if (
      state.id !== job.id ||
      !["queued", "running", "ready", "failed", "cancelled"].includes(
        state.status,
      ) ||
      !Number.isFinite(state.fraction) ||
      state.fraction < 0 ||
      state.fraction > 1 ||
      Object.keys(state).some(
        (k) =>
          ![
            "id",
            "status",
            "fraction",
            "expiresAt",
            "sequenceHash",
            "lines",
            "width",
            "height",
            "preview",
            "secondsPerConnection",
          ].includes(k),
      )
    )
      throw new GenerationFailure(true);
    if (["failed", "cancelled"].includes(state.status))
      throw new GenerationFailure(true);
    callbacks.onProgress(state.fraction);
    if (state.status === "ready") {
      if (
        !/^[a-f0-9]{64}$/.test(state.sequenceHash) ||
        state.lines !== attempt.body.lines ||
        state.width !== 1000 ||
        state.height !== 1000 ||
        !Number.isSafeInteger(state.expiresAt) ||
        state.expiresAt <= Date.now() ||
        typeof state.preview !== "string" ||
        state.preview.length < 32 ||
        state.preview.length > 5333340 ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(state.preview) ||
        !state.preview.startsWith("iVBORw0KGgo")
      )
        throw new GenerationFailure(true);
      return {
        ...job,
        kind: "protected-generation",
        sequenceHash: state.sequenceHash,
        lines: state.lines,
        preview: state.preview,
        expiresAt: state.expiresAt,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
  void cancelGeneration(job).catch(() => {});
  throw new GenerationFailure(true);
}
