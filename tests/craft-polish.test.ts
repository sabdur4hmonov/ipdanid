import { expect, it } from "vitest";
import {
  generateGrid,
  gridSvg,
  gridFile,
  parseGridProject,
  newGridProject,
  checkGridProfile,
  validateGrid,
  type GridProfile,
  type DiamondMaterial,
} from "../src/core/grid-craft";
import { generatePaint } from "../src/core/paint";
import {
  paintBoundaries,
  paintBoundaryPlan,
  paintBoundarySvg,
} from "../src/core/paint-boundaries";
const palette = [
  { code: "W", hex: "#ffffff", stock: 100 },
  { code: "B", hex: "#111111", stock: 100 },
];
const diamond: DiamondMaterial = {
  version: "diamond-material/1",
  style: "square",
  sizeMm: 2.2,
  attachment: "magnetic-steel",
  backingMm: 0.5,
  backingHex: "#faf8ef",
};
const profile: GridProfile = {
  kind: "diamond",
  pitchMm: 2.5,
  sparePercent: 10,
  provisional: true,
  palette,
  diamond,
};
it("hashes exact physical diamond materials in version2, renders square and round at declared mm and keeps old version1", async () => {
  const pixels = new Uint8Array(4 * 4 * 3),
    g = await generateGrid(pixels, 4, 4, profile);
  expect(g.schema).toBe("iprasm.grid/2");
  const piece = [...gridSvg(g).matchAll(/<rect x="[^"]+" y="[^"]+" width="([^"]+)" height="([^"]+)"/g)][1];
  expect(Number(piece[1]) * profile.pitchMm).toBeCloseTo(2.2);
  expect(Number(piece[2]) * profile.pitchMm).toBeCloseTo(2.2);
  expect(gridSvg(g)).toContain('fill="#faf8ef"');
  expect(gridSvg(g)).not.toContain("<circle");
  const parsed = await parseGridProject(
    gridFile(newGridProject(g, "Physical diamond")),
  );
  expect(parsed.guide.sequenceHash).toBe(g.sequenceHash);
  const tampered = structuredClone(g);
  tampered.profile.diamond!.backingHex = "#ffffff";
  await expect(validateGrid(tampered)).rejects.toThrow(/hash/);
  const oldProfile = { ...profile };
  delete oldProfile.diamond;
  const old = await generateGrid(pixels, 4, 4, oldProfile);
  expect(old.schema).toBe("iprasm.grid/1");
  expect(gridSvg(old)).toContain('r=".45"');
  expect(gridSvg(old)).toContain('fill="#fff"');
  const round = await generateGrid(pixels, 4, 4, {
    ...profile,
    diamond: { ...diamond, style: "round", sizeMm: 2 },
  });
  expect(gridSvg(round)).toContain('r="0.4"');
  expect(round.sequenceHash).not.toBe(g.sequenceHash);
});
it("rejects impossible overlapping pieces, invalid magnetic/adhesive material parameters and schema downgrade", async () => {
  for (const d of [
    { sizeMm: 3 },
    { sizeMm: NaN },
    { backingMm: 0 },
    { backingMm: 4 },
    { backingHex: "url(evil)" },
    { extra: true },
  ])
    expect(() =>
      checkGridProfile({ ...profile, diamond: { ...diamond, ...d } }),
    ).toThrow(/diamond/);
  expect(() => checkGridProfile({ ...profile, kind: "mosaic" })).toThrow(
    /diamond/,
  );
  expect(() =>
    checkGridProfile({
      ...profile,
      diamond: { ...diamond, attachment: "adhesive", backingMm: 0.5 },
    }),
  ).toThrow(/diamond/);
  const g = await generateGrid(new Uint8Array(48), 4, 4, profile);
  await expect(validateGrid({ ...g, schema: "iprasm.grid/1" })).rejects.toThrow(
    /version/,
  );
});
const paint = async (cells: number[]) =>
  generatePaint(
    Uint8Array.from(cells.flatMap((v) => [v * 255, v * 255, v * 255])),
    8,
    8,
    4,
    1,
    palette.map(({ code, hex }) => ({ code, hex })),
  );
it("traces real closed loops including holes, preserves area and places only fitting numeric labels", async () => {
  const cells = Array.from({ length: 64 }, (_, i) => {
    const x = i % 8,
      y = Math.floor(i / 8);
    return x >= 1 &&
      x <= 6 &&
      y >= 1 &&
      y <= 6 &&
      (x === 1 || x === 6 || y === 1 || y === 6)
      ? 0
      : 1;
  });
  const g = await paint(cells),
    boundaries = paintBoundaries(g),
    ring = boundaries.find((r) => r.cells === 20)!;
  expect(ring.loops).toHaveLength(2);
  expect(
    ring.loops.map((l) => l.signedAreaCells).sort((a, b) => a - b),
  ).toEqual([-16, 36]);
  expect(ring.loops.reduce((n, l) => n + l.perimeterMm, 0)).toBe(160);
  expect(boundaries.reduce((n, r) => n + r.areaCm2, 0)).toBeCloseTo(
    (64 * 16) / 100,
  );
  const plan = paintBoundaryPlan(g, [ring.region]);
  expect(plan.paintedPercent).toBe(31.25);
  expect(plan.coverage.reduce((n, c) => n + c.percent, 0)).toBe(100);
  const svg = paintBoundarySvg(g);
  expect(svg).toContain(g.sequenceHash);
  expect(svg).toContain("50 mm");
  expect(svg.match(/<text x=/g)?.length).toBe(
    boundaries.filter((r) => r.labelFits).length + 1,
  );
  expect(svg).not.toMatch(/script|onload|foreignObject/);
});
it("handles noisy corner contacts without open paths or phantom area across deterministic masks", async () => {
  for (let seed = 1; seed <= 12; seed++) {
    let n = seed;
    const cells = Array.from({ length: 64 }, () => {
        n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
        return n >>> 31;
      }),
      g = await paint(cells);
    for (const r of paintBoundaries(g)) {
      expect(r.loops.reduce((sum, l) => sum + l.signedAreaCells, 0)).toBe(
        r.cells,
      );
      for (const l of r.loops) {
        expect(l.points[0]).toEqual(l.points.at(-1));
        for (let i = 1; i < l.points.length; i++)
          expect(
            l.points[i][0] === l.points[i - 1][0] ||
              l.points[i][1] === l.points[i - 1][1],
          ).toBe(true);
      }
      expect(g.regions[r.region].cells).toContain(
        Math.floor(r.anchorMm[1] / 4) * 8 + Math.floor(r.anchorMm[0] / 4),
      );
    }
  }
});
