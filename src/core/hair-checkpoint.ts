import { hash } from "./engine";
import type { Instruction } from "./types";
import type { HeadImportance } from "./head-importance";
import type { HairCycleSettings } from "./hair-cycles";
export interface HairCycleCheckpoint {
  version: "hair-cycle-checkpoint/1";
  binding: string;
  pool: { from: number; to: number }[];
  cycles: { from: number; to: number }[];
  scanEvaluations: number;
  evaluations: number;
  elapsedMs: number;
  stateHash: string;
}
export function hairCheckpointBinding(
  seed: Instruction,
  head: HeadImportance,
  settings: HairCycleSettings,
) {
  return hash({
    version: "hair-cycle-checkpoint/1",
    root: seed.sequenceHash,
    target: seed.imageHash,
    requestedLines: seed.params.requestedLines,
    head,
    settings,
  });
}
export async function sealHairCheckpoint(
  state: Omit<HairCycleCheckpoint, "stateHash">,
): Promise<HairCycleCheckpoint> {
  return { ...structuredClone(state), stateHash: await hash(state) };
}
export async function validateHairCheckpoint(
  value: HairCycleCheckpoint,
  binding: string,
  pins: number,
) {
  const pairs = (a: { from: number; to: number }[], limit: number) =>
    Array.isArray(a) &&
    a.length <= limit &&
    a.every(
      (c) =>
        c &&
        Number.isSafeInteger(c.from) &&
        Number.isSafeInteger(c.to) &&
        c.from >= 0 &&
        c.from < c.to &&
        c.to < pins,
    );
  if (
    !value ||
    value.version !== "hair-cycle-checkpoint/1" ||
    value.binding !== binding ||
    !pairs(value.pool, 256) ||
    !pairs(value.cycles, 512) ||
    new Set(value.pool.map((c) => `${c.from}:${c.to}`)).size !==
      value.pool.length ||
    !Number.isSafeInteger(value.scanEvaluations) ||
    value.scanEvaluations < value.pool.length ||
    value.scanEvaluations > (pins * (pins - 1)) / 2 ||
    !Number.isSafeInteger(value.evaluations) ||
    value.evaluations < value.scanEvaluations ||
    value.evaluations > 100000 ||
    !Number.isFinite(value.elapsedMs) ||
    value.elapsedMs < 0 ||
    !/^[0-9a-f]{64}$/.test(value.stateHash)
  )
    throw Error("Incompatible or invalid hair optimization checkpoint");
  const { stateHash, ...state } = value;
  if ((await hash(state)) !== stateHash)
    throw Error("Hair optimization checkpoint integrity mismatch");
}
