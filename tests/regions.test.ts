import { expect, it } from "vitest";
import {
  sourceToTarget,
  targetToSource,
  sampleToDisplay,
  displayToSample,
  regionPixels,
  changeRegion,
} from "../src/core/coordinates";
import {
  DEFAULT_EDITS,
  type Instruction,
  type Project,
} from "../src/core/types";
import {
  DEFAULT_PORTRAIT,
  portraitRegions,
  regionMeasurements,
  validPortrait,
  contains,
  snapshotPortrait,
} from "../src/core/portrait";
import { createProfile } from "../src/core/geometry";
import { generate, hash, sequencePayload } from "../src/core/engine";
import {
  validateInstruction,
  progressFor,
  projectFile,
  parseProjectFile,
} from "../src/core/validation";
import { GenerationJobs, appendVariants } from "../src/core/variants";
const portrait = {
  ...DEFAULT_PORTRAIT,
  enabled: true,
  regions: {
    reference: "processed-target/sample-centers-v1" as const,
    eyes: { left: 0.22, top: 0.28, width: 0.55, height: 0.08 },
    nose: { left: 0.45, top: 0.42, width: 0.1, height: 0.14 },
    mouth: { left: 0.35, top: 0.64, width: 0.3, height: 0.06 },
  },
};
it("projects source landmarks through crop, pan-before-rotation and rectangular aspect with an exact inverse", () => {
  const e = {
    ...DEFAULT_EDITS,
    zoom: 1.4,
    panX: 0.12,
    panY: -0.08,
    rotation: 90,
  };
  // Independently calculated canvas coordinates: scale=.16*1.4, local=(41.6,-8.5333), rotate=(-dy,dx).
  const p = sourceToTarget(600, 700, 1000, 1400, e, 1.5);
  expect(sampleToDisplay(p.x, 160) * 160).toBeCloseTo(88.5333333333, 7);
  expect(sampleToDisplay(p.y, 160) * 160).toBeCloseTo(142.4, 7);
  for (const aspect of [0.75, 1, 1.5])
    for (const rotation of [-35, 0, 90]) {
      const edits = { ...e, rotation };
      const p = sourceToTarget(431, 763, 960, 1280, edits, aspect);
      const q = targetToSource(p.x, p.y, 960, 1280, edits, aspect);
      expect(q.x).toBeCloseTo(431, 9);
      expect(q.y).toBeCloseTo(763, 9);
    }
});
it("overlay inversion, measurement membership and exported inclusive crops agree at different display scales", () => {
  for (const n of [32, 160, 192]) {
    for (const u of [0, 0.27, 0.6, 1])
      expect(displayToSample(sampleToDisplay(u, n), n)).toBeCloseTo(u, 12);
    for (const b of Object.values(portraitRegions(portrait))) {
      const crop = regionPixels(b, n);
      const mismatches: number[] = [];
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++)
          if (
            contains(b, x / (n - 1), y / (n - 1)) !==
            (x >= crop.left &&
              x <= crop.right &&
              y >= crop.top &&
              y <= crop.bottom)
          )
            mismatches.push(y * n + x);
      expect(mismatches).toEqual([]);
    }
  }
});
it("regional errors measure the independently selected mouth rather than the chin", () => {
  const n = 32,
    p = createProfile("rectangle", 48),
    pixels = new Uint8Array(n * n * 3),
    raster = new Float32Array(pixels.length);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (contains(portrait.regions.mouth, x / (n - 1), y / (n - 1)))
        raster.fill(1, (y * n + x) * 3, (y * n + x + 1) * 3);
  const m = regionMeasurements(pixels, raster, n, p, portrait);
  expect(m.mouth.mse).toBe(1);
  expect(m.eyes.mse).toBe(0);
  expect(m.nose.mse).toBe(0);
  expect(() =>
    validPortrait({
      ...portrait,
      regions: {
        ...portrait.regions,
        mouth: { ...portrait.regions.mouth, top: 0.99 },
      },
    }),
  ).toThrow();
  expect(changeRegion(portrait.regions.mouth, 10, -10)).toMatchObject({
    left: 0.7,
    top: 0,
  });
  expect(changeRegion(portrait.regions.mouth, -10, 10, true)).toMatchObject({
    width: 0.01,
    height: 0.36,
  });
});
it("manual regions survive immutable guide export/import and affect its hash; old guides need no migration", async () => {
  const i = await generate({
    pixels: new Uint8Array(32 * 32 * 3).fill(180),
    resolution: 32,
    profile: createProfile("circle", 48),
    lines: 20,
    mode: "dark",
    portrait,
  });
  const exported = projectFile({
    id: crypto.randomUUID(),
    name: "region fixture",
    instruction: i,
    progress: progressFor(i),
    edits: DEFAULT_EDITS,
  });
  const restored = (await parseProjectFile(
    JSON.stringify(exported),
  )) as Project;
  expect(restored.instruction.params.portrait?.regions).toEqual(
    portrait.regions,
  );
  expect(restored.progress.confirmed).toBe(0);
  const changed = structuredClone(i);
  changed.params.portrait!.regions!.mouth.top += 0.01;
  expect(await hash(sequencePayload(changed))).not.toBe(i.sequenceHash);
  await expect(validateInstruction(changed)).rejects.toThrow();
  const legacy = await generate({
    pixels: new Uint8Array(32 * 32 * 3).fill(180),
    resolution: 32,
    profile: createProfile("circle", 48),
    lines: 20,
    mode: "dark",
    portrait: DEFAULT_PORTRAIT,
  });
  expect(
    (await validateInstruction(legacy)).params.portrait?.regions,
  ).toBeUndefined();
});
it("result transactions select the returned id through trimming and reject cancelled asynchronous jobs", async () => {
  const v = (id: string) => ({
    instruction: { id } as Instruction,
    name: id,
    edits: DEFAULT_EDITS,
  });
  const state = appendVariants(
    {
      items: [v("a"), v("b"), v("c"), v("d"), v("e"), v("f")],
      selectedId: "a",
    },
    [v("basis"), v("new")],
  );
  expect(state.items.map((x) => x.instruction.id)).toEqual([
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "basis",
    "new",
  ]);
  expect(state.selectedId).toBe("new");
  const jobs = new GenerationJobs(),
    a = jobs.begin();
  const validation = Promise.resolve().then(() => jobs.accepts(a));
  jobs.cancel();
  const b = jobs.begin();
  expect(await validation).toBe(false);
  expect(jobs.accepts(b)).toBe(true);
  expect(jobs.accepts(a)).toBe(false);
});
it("fresh estimated regions carry an explicit reference without changing the legacy pixel weighting", async () => {
  const original = { ...DEFAULT_PORTRAIT, enabled: true },
    snapshot = snapshotPortrait(original);
  expect(original).not.toHaveProperty("regions");
  expect(snapshot.regions?.placement).toBe("proportional-estimate");
  expect(portraitRegions(snapshot)).toEqual(portraitRegions(original));
  const options = {
    pixels: new Uint8Array(32 * 32 * 3).fill(160),
    resolution: 32,
    profile: createProfile("circle", 48),
    lines: 20,
    mode: "dark" as const,
  };
  const before = await generate({ ...options, portrait: original }),
    after = await generate({ ...options, portrait: snapshot });
  expect(after.segments).toEqual(before.segments);
  expect(after.imageHash).toBe(before.imageHash);
  expect(after.sequenceHash).not.toBe(before.sequenceHash);
});
