import { it, expect } from "vitest";
import {
  generatePaint,
  paintRegions,
  paintEdges,
  paintCoverage,
  paintPayload,
  paintSvg,
  paintCsv,
  paintFile,
  parsePaintProject,
  newPaintProject,
  validatePaint,
  validatePaintProject,
  checkPaintSettings,
  mergePaintCells,
} from "../src/core/paint";
import { hash } from "../src/core/engine";
const palette = [
  { code: "W", hex: "#ffffff" },
  { code: "B", hex: "#000000" },
];
const rgb = (cells: number[]) =>
  Uint8Array.from(cells.flatMap((c) => new Array(3).fill(c ? 0 : 255)));
it("fast component graph exactly preserves the original smallest-first flood-fill decisions across deterministic noisy and tied palettes", () => {
  const colors = [
      [0, 0, 0],
      [1, 1, 1],
      [0.3, 0.2, 0.1],
      [0.2, 0.3, 0.4],
    ],
    distance = (a: number[], b: number[]) =>
      a.reduce(
        (s, v, k) => s + [0.2126, 0.7152, 0.0722][k] * (v - b[k]) ** 2,
        0,
      );
  const neighbours = (k: number) =>
    [
      k % 8 > 0 ? k - 1 : -1,
      k % 8 < 7 ? k + 1 : -1,
      k >= 8 ? k - 8 : -1,
      k < 56 ? k + 8 : -1,
    ].filter((k) => k >= 0);
  const slow = (source: number[], minimum: number) => {
    const cells = [...source];
    for (let pass = 0; pass < 64; pass++) {
      const seen = new Set<number>(),
        components: { color: number; cells: number[] }[] = [];
      for (let start = 0; start < 64; start++)
        if (!seen.has(start)) {
          const group = [start];
          seen.add(start);
          for (let q = 0; q < group.length; q++)
            for (const k of neighbours(group[q]))
              if (!seen.has(k) && cells[k] === cells[start]) {
                seen.add(k);
                group.push(k);
              }
          components.push({
            color: cells[start],
            cells: group.sort((a, b) => a - b),
          });
        }
      const tiny = components
        .filter((r) => r.cells.length < minimum)
        .sort(
          (a, b) => a.cells.length - b.cells.length || a.cells[0] - b.cells[0],
        )[0];
      if (!tiny) break;
      const edges = new Map<number, number>();
      for (const k of tiny.cells)
        for (const j of neighbours(k))
          if (cells[j] !== tiny.color)
            edges.set(cells[j], (edges.get(cells[j]) ?? 0) + 1);
      if (!edges.size) break;
      const chosen = [...edges].sort(
        (a, b) =>
          distance(colors[tiny.color], colors[a[0]]) -
            distance(colors[tiny.color], colors[b[0]]) ||
          b[1] - a[1] ||
          a[0] - b[0],
      )[0][0];
      tiny.cells.forEach((k) => (cells[k] = chosen));
    }
    return cells;
  };
  for (let seed = 1; seed <= 20; seed++)
    for (const minimum of [1, 3, 12, 64]) {
      let state = seed;
      const source = Array.from({ length: 64 }, () => {
        state = (1664525 * state + 1013904223) >>> 0;
        return state >>> 30;
      });
      expect(mergePaintCells(source, 8, 8, minimum, colors)).toEqual(
        slow(source, minimum),
      );
    }
});
it("merges noise through a shared boundary, retains a large feature, and deterministically covers every source cell once", async () => {
  const cells = Array.from({ length: 64 }, (_, k) => (k % 8 >= 4 ? 1 : 0));
  cells[9] = 1;
  const g = await generatePaint(rgb(cells), 8, 8, 4, 4, palette),
    same = await generatePaint(rgb(cells), 8, 8, 4, 4, palette);
  expect(g.sequenceHash).toBe(same.sequenceHash);
  expect(g.cells[9]).toBe(0);
  expect(g.regions.map((r) => r.cells.length)).toEqual([32, 32]);
  expect(g.regions.flatMap((r) => r.cells).sort((a, b) => a - b)).toEqual(
    Array.from({ length: 64 }, (_, k) => k),
  );
  expect(Object.isFrozen(g.regions[0].cells)).toBe(true);
  expect(Object.isFrozen(g.palette)).toBe(true);
  expect(paintCoverage(g).reduce((n, c) => n + c.areaCm2, 0)).toBeCloseTo(
    (32 * 32) / 100,
  );
});
it("diagonally touching colour islands remain independent, and label anchors do not cross holes or thin necks", () => {
  const cells = new Array(64).fill(0);
  cells[27] = 1;
  cells[36] = 1;
  const r = paintRegions(cells, 8, 8, 1),
    islands = r.filter((r) => r.color === 1);
  expect(islands).toHaveLength(2);
  expect(islands.every((r) => !r.labelFits)).toBe(true);
  for (const region of r) expect(region.cells).toContain(region.anchor);
  const ring = Array.from({ length: 100 }, (_, k) => {
    const x = k % 10,
      y = Math.floor(k / 10);
    return x >= 2 && x < 8 && y >= 2 && y < 8 ? 1 : 0;
  });
  const regions = paintRegions(ring, 10, 10, 1);
  expect(regions.find((r) => r.color === 0)!.labelFits).toBe(false);
  expect(regions.find((r) => r.color === 1)!.labelFits).toBe(true);
});
it("physical print-safe labels reflect actual dimensions, with no internal pixel-grid edges", async () => {
  const g = await generatePaint(
    rgb(new Array(64).fill(0)),
    8,
    8,
    1,
    1,
    palette,
  );
  expect(g.regions).toHaveLength(1);
  expect(g.regions[0].labelFits).toBe(true);
  expect(paintEdges(g)).toHaveLength(32);
  const svg = paintSvg(g);
  expect(svg).toContain('width="8mm"');
  expect(svg).toContain(g.sequenceHash);
  expect(svg.match(/<text /g)).toHaveLength(1);
  expect(svg.match(/<rect /g)).toHaveLength(1);
});
it("rejects forged region anatomy/anchors even when the supplied hash is recomputed", async () => {
  const g = await generatePaint(
    rgb(Array.from({ length: 64 }, (_, k) => (k % 8 >= 4 ? 1 : 0))),
    8,
    8,
    4,
    1,
    palette,
  );
  for (const mutate of [
    (g: any) => (g.regions[0].anchor = 7),
    (g: any) => g.regions[0].cells.push(7),
    (g: any) => (g.regions[0].labelFits = false),
    (g: any) => g.regions.reverse(),
  ]) {
    const bad = structuredClone(g);
    mutate(bad);
    bad.sequenceHash = await hash(paintPayload(bad));
    await expect(validatePaint(bad)).rejects.toThrow("regions");
  }
  const bad = structuredClone(g);
  bad.cells[0] = 1;
  await expect(validatePaint(bad)).rejects.toThrow();
});
it("independent completed regions survive import with a new project ID and reject duplicates, unsorted and unrelated progress", async () => {
  const g = await generatePaint(
      rgb(Array.from({ length: 64 }, (_, k) => k % 2)),
      8,
      8,
      4,
      1,
      palette,
    ),
    p = newPaintProject(g, "paint");
  p.progress.completed = [0, 3, 5];
  p.progress.revision = 2;
  const copied = await parsePaintProject(paintFile(p));
  expect(copied.id).not.toBe(p.id);
  expect(copied.guide).toEqual(g);
  expect(copied.progress).toEqual(p.progress);
  for (const completed of [[0, 0], [5, 3], [-1], [g.regions.length], [0.5]]) {
    const bad = structuredClone(p);
    bad.progress.completed = completed;
    await expect(validatePaintProject(bad)).rejects.toThrow("progress");
  }
  const bad = structuredClone(p);
  bad.progress.sequenceHash = "a".repeat(64);
  await expect(validatePaintProject(bad)).rejects.toThrow("progress");
  const hiddenName = structuredClone(p);
  hiddenName.name = "Paint\u0000hidden";
  await expect(validatePaintProject(hiddenName)).rejects.toThrow("project");
  expect(paintCsv(g, p.progress.completed).split("\n")).toHaveLength(
    g.regions.length + 1,
  );
});
it("bounds palette, dimensions, tiny-region merging and hostile text before calculation/import", async () => {
  for (const args of [
    [8, 8, 0, 1, palette],
    [8, 8, 1, 65, palette],
    [97, 8, 1, 1, palette],
    [8, 8, 1, 1, [...palette, { code: "<script>", hex: "#ff0000" }]],
    [8, 8, 1, 1, [palette[0], palette[0]]],
  ] as const)
    expect(() =>
      checkPaintSettings(
        ...(args as [number, number, number, number, typeof palette]),
      ),
    ).toThrow();
  await expect(
    generatePaint(new Uint8Array(3), 8, 8, 1, 1, palette),
  ).rejects.toThrow("target");
  await expect(parsePaintProject("x".repeat(2_000_001))).rejects.toThrow(
    "limit",
  );
  const g = await generatePaint(
    rgb(Array.from({ length: 64 }, (_, k) => k % 2)),
    8,
    8,
    1,
    64,
    palette,
  );
  expect(g.regions).toHaveLength(1);
  expect(g.regions[0].cells).toHaveLength(64);
});
