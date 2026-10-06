import type { GenerateOptions } from "./engine";
export class ContinuationError extends Error {
  constructor(
    prefix: string,
    readonly mismatches: string[],
  ) {
    super(`${prefix} [${mismatches.join(",")}]`);
    this.name = "ContinuationError";
  }
}
// Keep exact target and serialized immutable material/region equality. Never substitute
// a more permissive resemblance/tolerance test for a saved seed's identity.
export function assertContinuation(
  o: GenerateOptions,
  targetHash: string,
  algorithms?: string[],
) {
  const s = o.seed;
  if (!s) return;
  const failed: string[] = [];
  if (algorithms && !algorithms.includes(s.algorithm)) failed.push("algorithm");
  if (!o.portrait?.enabled || o.mode === "color" || s.params.mode !== o.mode)
    failed.push("mode");
  if (s.imageHash !== targetHash) failed.push("target");
  if (s.params.resolution !== o.resolution) failed.push("resolution");
  if (JSON.stringify(s.profile) !== JSON.stringify(o.profile))
    failed.push("profile");
  if (JSON.stringify(s.params.portrait) !== JSON.stringify(o.portrait))
    failed.push("regions");
  if (
    !algorithms &&
    (s.segments.length !== 1 || s.segments[0].color !== o.profile.colors[0])
  )
    failed.push("segments");
  if (failed.length)
    throw new ContinuationError(
      algorithms
        ? "Continuation requires the same portrait target and materials"
        : "Global rerouting requires the same portrait and materials",
      failed,
    );
}
