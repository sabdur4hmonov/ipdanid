import { it, expect } from "vitest";
import {
  sealHairCheckpoint,
  validateHairCheckpoint,
  hairCheckpointBinding,
} from "../src/core/hair-checkpoint";
import type { Instruction } from "../src/core/types";
import type { HeadImportance } from "../src/core/head-importance";
const state = {
  version: "hair-cycle-checkpoint/1" as const,
  binding: "a".repeat(64),
  pool: [{ from: 0, to: 20 }],
  cycles: [{ from: 0, to: 20 }],
  scanEvaluations: 1,
  evaluations: 3,
  elapsedMs: 20,
};
it("checkpoint integrity preserves the cumulative search budget and rejects edits, incompatible roots and unbounded data", async () => {
  const c = await sealHairCheckpoint(state);
  await expect(
    validateHairCheckpoint(c, state.binding, 240),
  ).resolves.toBeUndefined();
  await expect(
    validateHairCheckpoint({ ...c, evaluations: 1 }, state.binding, 240),
  ).rejects.toThrow("integrity");
  await expect(validateHairCheckpoint(c, "b".repeat(64), 240)).rejects.toThrow(
    "Incompatible",
  );
  for (const patch of [
    { evaluations: 100001 },
    { cycles: Array(513).fill({ from: 0, to: 20 }) },
    {
      pool: [
        { from: 0, to: 20 },
        { from: 0, to: 20 },
      ],
    },
    { pool: [{ from: 20, to: 0 }] },
    { elapsedMs: NaN },
  ])
    await expect(
      validateHairCheckpoint({ ...c, ...patch }, state.binding, 240),
    ).rejects.toThrow();
});
it("root, exact target, original line allowance, head geometry and fixed search settings bind recovery independently", async () => {
  const seed = {
    sequenceHash: "a".repeat(64),
    imageHash: "b".repeat(64),
    params: { requestedLines: 20000 },
  } as Instruction;
  const head = { points: [{ x: 0.2, y: 0.2 }], weight: 8 } as HeadImportance;
  const setting = {
    version: "face-protected-cycles/1" as const,
    referenceHash: seed.sequenceHash,
    faceClearanceMm: 4 as const,
    poolSize: 256 as const,
    evaluationLimit: 100000 as const,
    cycleLimit: 512 as const,
    objective: "head-physical-overshoot/1" as const,
  };
  const bound = await hairCheckpointBinding(seed, head, setting);
  for (const changed of [
    { ...seed, sequenceHash: "c".repeat(64) },
    { ...seed, imageHash: "d".repeat(64) },
    { ...seed, params: { requestedLines: 10000 } },
  ])
    expect(
      await hairCheckpointBinding(changed as Instruction, head, setting),
    ).not.toBe(bound);
  expect(
    await hairCheckpointBinding(seed, { ...head, weight: 7 }, setting),
  ).not.toBe(bound);
  expect(
    await hairCheckpointBinding(seed, head, {
      ...setting,
      referenceHash: "e".repeat(64),
    }),
  ).not.toBe(bound);
});
