import { it, expect } from "vitest";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import {
  makeSolidPlan,
  validateSolidPlan,
  solidPartMesh,
  solidTemplateSvg,
  solidLayoutSvg,
  SOLID_DEFAULTS,
} from "../src/core/solid-plan";
import {
  extrudeSolid,
  meshFacts,
  solidStl,
  ringArea,
} from "../src/core/solid-geometry";
import { LETTERING_FONTS } from "../src/core/lettering";
import { solidPdf } from "../src/core/solid-pdf";
import { PDFDocument } from "pdf-lib";
const fonts = Object.fromEntries(
  Object.entries(LETTERING_FONTS).map(([key, f]) => [
    key,
    new Uint8Array(readFileSync("public" + f.path)),
  ]),
);
mkdirSync("output/current-solid/unit", { recursive: true });
it("prints localized physical frame templates and a confirmed snapshot from the same canonical plan", async () => {
  const g = await makeSolidPlan({ ...SOLID_DEFAULTS.frame });
  for (const locale of ["uz", "uz-Cyrl", "ru", "en"] as const) {
    const bytes = await solidPdf(g, locale, 2, fonts.sans),
      doc = await PDFDocument.load(bytes);
    expect(doc.getSubject()).toBe(g.sequenceHash);
    expect(doc.getPages()).toHaveLength(28);
    expect(doc.getPages()[2].getWidth()).toBeCloseTo((544.5 * 72) / 25.4, 5);
    expect(doc.getPages()[2].getHeight()).toBeCloseTo((574.5 * 72) / 25.4, 5);
    if (locale === "uz-Cyrl")
      writeFileSync("output/current-solid/unit/frame-cyrl.pdf", bytes);
  }
  await expect(solidPdf(g, "en", 5, fonts.sans)).rejects.toThrow("progress");
  const letters = await makeSolidPlan(
    { ...SOLID_DEFAULTS.letters, text: "Ali علي" },
    fonts,
  );
  const bytes = await solidPdf(letters, "en", 0, fonts.sans, fonts);
  expect((await PDFDocument.load(bytes)).getPages().length).toBeGreaterThan(2);
  writeFileSync("output/current-solid/unit/letters.pdf", bytes);
  expect(solidLayoutSvg(letters)).toContain('data-part="assembly"');
  writeFileSync(
    "output/current-solid/unit/letters-layout.svg",
    solidLayoutSvg(letters),
  );
});
it("extrudes a true closed oriented solid with a hole and refuses missing/reversed/degenerate faces", () => {
  const mesh = extrudeSolid(
    [
      [
        [
          [0, 0],
          [20, 0],
          [20, 20],
          [0, 20],
        ],
        [
          [5, 5],
          [5, 15],
          [15, 15],
          [15, 5],
        ],
      ],
    ],
    3,
  );
  expect(meshFacts(mesh).volumeMm3).toBe(900);
  expect(meshFacts(mesh).min).toEqual([0, 0, 0]);
  expect(meshFacts(mesh).max).toEqual([20, 20, 3]);
  expect(() => meshFacts(mesh.slice(1))).toThrow("non-manifold");
  const flipped = structuredClone(mesh);
  flipped[0].reverse();
  expect(() => meshFacts(flipped)).toThrow("non-manifold");
  expect(() =>
    meshFacts([
      [
        [0, 0, 0],
        [0, 0, 0],
        [1, 1, 1],
      ],
    ]),
  ).toThrow("degenerate");
});
it("makes four dimensioned mitred frame rails whose assembled opening and material volume match the board clearance", async () => {
  const g = await makeSolidPlan({ ...SOLID_DEFAULTS.frame });
  expect(g.parts).toHaveLength(4);
  const outside = 524.5,
    inside = 500.5;
  expect(g.parts.reduce((v, p) => v + p.volumeMm3, 0)).toBeCloseTo(
    (outside ** 2 - inside ** 2) * 8,
    5,
  );
  for (let step = 1; step <= 4; step++) {
    const mesh = solidPartMesh(g, step),
      facts = meshFacts(mesh),
      stl = solidStl(mesh, g.sequenceHash);
    expect(facts.max[2]).toBe(8);
    expect(new DataView(stl.buffer).getUint32(80, true)).toBe(mesh.length);
    expect(stl.length).toBe(84 + 50 * mesh.length);
    expect(solidTemplateSvg(g, step)).toContain("h50");
  }
  expect((await validateSolidPlan(g)).sequenceHash).toBe(g.sequenceHash);
  mkdirSync("output/current-solid/unit", { recursive: true });
  writeFileSync("output/current-solid/unit/frame.json", JSON.stringify(g));
  writeFileSync(
    "output/current-solid/unit/rail.stl",
    solidStl(solidPartMesh(g, 1), g.sequenceHash),
  );
  writeFileSync("output/current-solid/unit/rail.svg", solidTemplateSvg(g, 1));
});
it("stacks the original spindle in exact layer order with a real alignment bore and closed per-layer STL", async () => {
  const g = await makeSolidPlan({ ...SOLID_DEFAULTS.spindle });
  expect(g.parts).toHaveLength(20);
  for (const [i, p] of g.parts.entries()) {
    expect(p.zMm).toBe(i * 4);
    expect(p.polygons[0]).toHaveLength(2);
    expect(ringArea(p.polygons[0][0])).toBeGreaterThan(0);
    expect(ringArea(p.polygons[0][1])).toBeLessThan(0);
    const hole = p.polygons[0][1],
      centre = SOLID_DEFAULTS.spindle.diameterMm / 2,
      minRadius = Math.min(
        ...hole.map((a, j) => {
          const b = hole[(j + 1) % hole.length];
          return (
            Math.abs(
              (b[0] - a[0]) * (centre - a[1]) - (b[1] - a[1]) * (centre - a[0]),
            ) / Math.hypot(b[0] - a[0], b[1] - a[1])
          );
        }),
      );
    expect(minRadius * 2).toBeCloseTo(SOLID_DEFAULTS.spindle.boreMm, 5);
    expect(meshFacts(solidPartMesh(g, i + 1)).min[2]).toBe(0);
    expect(meshFacts(solidPartMesh(g, i + 1, true)).min[2]).toBe(i * 4);
  }
  writeFileSync("output/current-solid/unit/spindle.json", JSON.stringify(g));
  writeFileSync(
    "output/current-solid/unit/layer.stl",
    solidStl(solidPartMesh(g, 10), g.sequenceHash),
  );
  writeFileSync("output/current-solid/unit/layer.svg", solidTemplateSvg(g, 10));
});
it("unions shaped Latin Cyrillic Arabic mixed lettering and real counters before producing non-overlapping closed solids", async () => {
  for (const text of ["Ali", "МИР", "علي", "Ali علي", "O8"]) {
    const g = await makeSolidPlan({ ...SOLID_DEFAULTS.letters, text }, fonts);
    expect(g.parts.length).toBeGreaterThan(0);
    for (let step = 1; step <= g.parts.length; step++)
      expect(meshFacts(solidPartMesh(g, step)).volumeMm3).toBeGreaterThan(0);
    expect((await validateSolidPlan(g, fonts)).sequenceHash).toBe(
      g.sequenceHash,
    );
    if (text === "O8")
      expect(g.parts.flatMap((p) => p.polygons).some((p) => p.length > 1)).toBe(
        true,
      );
    if (text === "Ali علي") {
      writeFileSync(
        "output/current-solid/unit/letters.json",
        JSON.stringify(g),
      );
      writeFileSync(
        "output/current-solid/unit/letter.stl",
        solidStl(solidPartMesh(g, 1), g.sequenceHash),
      );
      writeFileSync(
        "output/current-solid/unit/letter.svg",
        solidTemplateSvg(g, 1),
      );
    }
  }
});
it("refuses invalid dimensions, extra source fields and tampered hole/height/source/provenance", async () => {
  for (const source of [
    { ...SOLID_DEFAULTS.frame, wallMm: 0 },
    { ...SOLID_DEFAULTS.spindle, layers: 100 },
    { ...SOLID_DEFAULTS.letters, text: "" },
    { ...SOLID_DEFAULTS.frame, extra: 1 },
    { kind: "toString" },
  ])
    await expect(makeSolidPlan(source as any, fonts)).rejects.toThrow();
  const g = await makeSolidPlan({ ...SOLID_DEFAULTS.spindle }),
    bad = structuredClone(g);
  bad.parts[0].polygons[0].pop();
  await expect(validateSolidPlan(bad)).rejects.toThrow("provenance");
  const shifted = structuredClone(g);
  shifted.parts[0].zMm = 1;
  await expect(validateSolidPlan(shifted)).rejects.toThrow("provenance");
  expect(() => solidPartMesh(g, 0)).toThrow("step");
});
