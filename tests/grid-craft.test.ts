import { it, expect } from "vitest";
import {
  generateGrid,
  validateGrid,
  gridCounts,
  gridCell,
  gridCsv,
  gridSvg,
  gridPayload,
  replaceGridCell,
  newGridProject,
  parseGridProject,
  gridFile,
  type GridProfile,
} from "../src/core/grid-craft";
import { hash } from "../src/core/engine";
const material: GridProfile = {
  kind: "mosaic",
  pitchMm: 8,
  sparePercent: 0,
  palette: [
    { code: "W", hex: "#ffffff", stock: 16 },
    { code: "B", hex: "#000000", stock: 16 },
  ],
  provisional: true,
};
it("fits actual stock, assigns each source pixel once, preserves deterministic traversal and immutable export identity", async () => {
  const pixels = Uint8Array.from({ length: 48 }, (_, k) =>
      Math.floor(k / 3) % 2 ? 255 : 0,
    ),
    g = await generateGrid(pixels, 4, 4, material),
    same = await generateGrid(pixels, 4, 4, material);
  expect(g.sequenceHash).toBe(same.sequenceHash);
  expect(Object.isFrozen(g)).toBe(true);
  expect(Object.isFrozen(g.cells)).toBe(true);
  expect(Object.isFrozen(g.profile.palette)).toBe(true);
  expect(g.cells).toEqual([1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]);
  expect(gridCounts(g).map((c) => c.used)).toEqual([8, 8]);
  expect([...Array(16)].map((_, j) => gridCell(g, j + 1).index)).toEqual([
    0, 1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12,
  ]);
  expect(gridCsv(g).split("\n")).toHaveLength(17);
  expect(gridSvg(g)).toContain('width="32mm"');
  const p = newGridProject(g, "actual grid");
  p.progress.confirmed = 5;
  const imported = await parseGridProject(gridFile(p));
  expect(imported.id).not.toBe(p.id);
  expect(imported.guide).toEqual(g);
  expect(imported.progress).toEqual(p.progress);
  const noBlack = {
      ...material,
      palette: [
        { ...material.palette[0], stock: 16 },
        { ...material.palette[1], stock: 0 },
      ],
    },
    restricted = await generateGrid(pixels, 4, 4, noBlack);
  expect(restricted.cells).toEqual(new Array(16).fill(0));
});
it("diamond spares reserve real inventory; insufficient kits, bad sizes, accounting tamper and progress mismatch fail", async () => {
  const profile: GridProfile = {
      ...material,
      kind: "diamond",
      pitchMm: 2.5,
      sparePercent: 10,
      palette: material.palette.map((c) => ({ ...c, stock: 9 })),
    },
    g = await generateGrid(new Uint8Array(48).fill(160), 4, 4, profile);
  expect(gridCounts(g).every((c) => c.required === 9 && c.spares === 1)).toBe(
    true,
  );
  expect(gridSvg(g)).toContain('width="10mm"');
  expect(gridSvg(g).match(/<circle /g)).toHaveLength(16);
  await expect(
    generateGrid(new Uint8Array(48), 4, 4, {
      ...profile,
      palette: profile.palette.map((c) => ({ ...c, stock: 8 })),
    }),
  ).rejects.toThrow("Insufficient");
  await expect(
    generateGrid(new Uint8Array(48), 100, 4, profile),
  ).rejects.toThrow("dimensions");
  const tampered = structuredClone(g);
  tampered.cells[0] = 1 - tampered.cells[0];
  await expect(validateGrid(tampered)).rejects.toThrow();
  const p = newGridProject(g, "tamper");
  p.progress.sequenceHash = "a".repeat(64);
  await expect(parseGridProject(gridFile(p))).rejects.toThrow("progress");
  const excess = structuredClone(g);
  excess.profile.palette[0].stock = 0;
  excess.sequenceHash = await hash(gridPayload(excess));
  await expect(validateGrid(excess)).rejects.toThrow("inventory");
});
it("manual cell edits create a separate hashed guide and reset only the new progress; stock limits still apply", async () => {
  const g = await generateGrid(new Uint8Array(48).fill(255), 4, 4, material),
    p = newGridProject(g, "keep");
  p.progress.confirmed = 7;
  const edited = await replaceGridCell(g, 0, 1),
    next = newGridProject(edited, "new");
  expect(next.progress.confirmed).toBe(0);
  expect(p.progress.confirmed).toBe(7);
  expect(p.guide.cells[0]).toBe(0);
  expect(edited.cells[0]).toBe(1);
  expect(edited.sequenceHash).not.toBe(g.sequenceHash);
  const blocked = await generateGrid(new Uint8Array(48).fill(255), 4, 4, {
    ...material,
    palette: [material.palette[0], { ...material.palette[1], stock: 0 }],
  });
  await expect(replaceGridCell(blocked, 0, 1)).rejects.toThrow("inventory");
});
