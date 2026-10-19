import clipping from "polygon-clipping";
import { hash, deepFreeze } from "./engine";
import { shapeText } from "./mixed-lettering";
import type { LetteringFont } from "./lettering";
import {
  extrudeSolid,
  meshFacts,
  solidRing,
  ringArea,
  pointInRing,
  solidRound,
  type Point2,
  type SolidPolygon,
} from "./solid-geometry";
export type SolidSource =
  | {
      kind: "frame";
      widthMm: number;
      heightMm: number;
      clearanceMm: number;
      wallMm: number;
      thicknessMm: number;
    }
  | {
      kind: "spindle";
      layers: number;
      diameterMm: number;
      layerMm: number;
      boreMm: number;
    }
  | {
      kind: "letters";
      text: string;
      widthMm: number;
      heightMm: number;
      thicknessMm: number;
    };
export const SOLID_DEFAULTS = {
  frame: {
    kind: "frame",
    widthMm: 500,
    heightMm: 500,
    clearanceMm: 0.5,
    wallMm: 12,
    thicknessMm: 8,
  },
  spindle: {
    kind: "spindle",
    layers: 20,
    diameterMm: 66,
    layerMm: 4,
    boreMm: 4.2,
  },
  letters: {
    kind: "letters",
    text: "Ali",
    widthMm: 140,
    heightMm: 60,
    thicknessMm: 4,
  },
} as const;
export type SolidPart = {
  id: string;
  polygons: SolidPolygon[];
  zMm: number;
  heightMm: number;
  volumeMm3: number;
};
export type SolidPlan = {
  schema: "iprasm.solid-plan/1";
  geometry: "original-extrusions/1";
  source: SolidSource;
  parts: SolidPart[];
  fontProof?: unknown;
  sequenceHash: string;
  accessPolicy: "kit-build/1";
};
function checkSource(source: SolidSource) {
  if (
    !source ||
    !Object.hasOwn(SOLID_DEFAULTS, source.kind) ||
    Object.keys(source).sort().join() !==
      Object.keys(SOLID_DEFAULTS[source.kind]).sort().join() ||
    Object.entries(source).some(
      ([k, v]) =>
        k !== "kind" &&
        k !== "text" &&
        (typeof v !== "number" || !Number.isFinite(v)),
    )
  )
    throw Error("solid/source");
  if (
    source.kind === "frame" &&
    (source.widthMm < 80 ||
      source.widthMm > 600 ||
      source.heightMm < 80 ||
      source.heightMm > 600 ||
      source.clearanceMm < 0.2 ||
      source.clearanceMm > 2 ||
      source.wallMm < 4 ||
      source.wallMm > 30 ||
      source.thicknessMm < 2 ||
      source.thicknessMm > 20)
  )
    throw Error("solid/materials");
  if (
    source.kind === "spindle" &&
    (!Number.isInteger(source.layers) ||
      source.layers < 4 ||
      source.layers > 40 ||
      source.diameterMm < 30 ||
      source.diameterMm > 180 ||
      source.layerMm < 1 ||
      source.layerMm > 8 ||
      source.boreMm < 2 ||
      source.boreMm > 10 ||
      source.diameterMm * 0.45 < source.boreMm + 10)
  )
    throw Error("solid/materials");
  if (
    source.kind === "letters" &&
    (typeof source.text !== "string" ||
      [...source.text].length > 16 ||
      source.widthMm < 50 ||
      source.widthMm > 300 ||
      source.heightMm < 50 ||
      source.heightMm > 150 ||
      source.thicknessMm < 1 ||
      source.thicknessMm > 10)
  )
    throw Error("solid/materials");
}
function circle(x: number, y: number, r: number, n: number): Point2[] {
  return Array.from({ length: n }, (_, i) => [
    solidRound(x + r * Math.cos((i * 2 * Math.PI) / n)),
    solidRound(y + r * Math.sin((i * 2 * Math.PI) / n)),
  ]);
}
export async function makeSolidPlan(
  source: SolidSource,
  fonts?: Partial<Record<LetteringFont, Uint8Array>>,
): Promise<SolidPlan> {
  checkSource(source);
  const s = structuredClone(source),
    parts: SolidPart[] = [];
  let fontProof: unknown,
    totalTriangles = 0;
  const add = (
    id: string,
    polygons: SolidPolygon[],
    heightMm: number,
    zMm = 0,
  ) => {
    polygons = polygons.map((p) => p.map((r, i) => solidRing(r, i === 0)));
    const facts = meshFacts(extrudeSolid(polygons, heightMm, zMm));
    totalTriangles += facts.triangles;
    if (totalTriangles > 40000) throw Error("solid/mesh-bounds");
    parts.push({ id, polygons, zMm, heightMm, volumeMm3: facts.volumeMm3 });
  };
  if (s.kind === "frame") {
    const w = s.widthMm + s.clearanceMm + s.wallMm * 2,
      h = s.heightMm + s.clearanceMm + s.wallMm * 2,
      t = s.wallMm;
    add(
      "rail-1",
      [
        [
          [
            [0, 0],
            [w, 0],
            [w - t, t],
            [t, t],
          ],
        ],
      ],
      s.thicknessMm,
    );
    add(
      "rail-2",
      [
        [
          [
            [w, 0],
            [w, h],
            [w - t, h - t],
            [w - t, t],
          ],
        ],
      ],
      s.thicknessMm,
    );
    add(
      "rail-3",
      [
        [
          [
            [w, h],
            [0, h],
            [t, h - t],
            [w - t, h - t],
          ],
        ],
      ],
      s.thicknessMm,
    );
    add(
      "rail-4",
      [
        [
          [
            [0, h],
            [0, 0],
            [t, t],
            [t, h - t],
          ],
        ],
      ],
      s.thicknessMm,
    );
  } else if (s.kind === "spindle") {
    const centre = s.diameterMm / 2;
    for (let i = 0; i < s.layers; i++) {
      const r =
          centre * (0.45 + 0.55 * Math.sin((Math.PI * (i + 0.5)) / s.layers)),
        outer = circle(centre, centre, r, 64),
        hole = circle(
          centre,
          centre,
          s.boreMm / (2 * Math.cos(Math.PI / 32)),
          32,
        );
      add(
        "layer-" + (i + 1),
        [[outer, hole]],
        s.layerMm,
        solidRound(i * s.layerMm),
      );
    }
  } else {
    const g = await shapeText(
      s.text,
      { widthMm: s.widthMm, heightMm: s.heightMm, shape: "rectangle" },
      fonts,
    );
    if (s.text !== g.text) throw Error("solid/source");
    fontProof = {
      version: g.version,
      font: g.font,
      fontHash: g.fontHash,
      ...(g.fontRuns ? { fontRuns: g.fontRuns } : {}),
    };
    const rings = g.contours
      .map((r) =>
        r
          .slice(0, -1)
          .map(
            (p) =>
              [
                solidRound(p.x * s.widthMm),
                solidRound((1 - p.y) * s.heightMm),
              ] as Point2,
          ),
      )
      .filter((r) => Math.abs(ringArea(r)) > 1e-5);
    if (!rings.length || rings.flat().length > 15000)
      throw Error("solid/contour");
    const sign = Math.sign(
        ringArea(
          rings.reduce((a, b) =>
            Math.abs(ringArea(a)) > Math.abs(ringArea(b)) ? a : b,
          ),
        ),
      ),
      outers = rings.filter((r) => Math.sign(ringArea(r)) === sign),
      holes = rings.filter((r) => Math.sign(ringArea(r)) !== sign),
      polys = outers.map((r) => [r]);
    for (const hole of holes) {
      const parents = outers
        .map((r, i) => ({ r, i }))
        .filter((p) => pointInRing(hole[0], p.r))
        .sort((a, b) => Math.abs(ringArea(a.r)) - Math.abs(ringArea(b.r)));
      if (!parents.length) throw Error("solid/hole");
      polys[parents[0].i].push(hole);
    }
    const united = clipping.union(polys[0], ...polys.slice(1));
    if (!united.length || united.length > 64) throw Error("solid/contour");
    united.forEach((polygon, i) =>
      add("letter-" + (i + 1), [polygon], s.thicknessMm),
    );
  }
  const data = {
    schema: "iprasm.solid-plan/1" as const,
    geometry: "original-extrusions/1" as const,
    source: s,
    parts,
    ...(fontProof ? { fontProof } : {}),
    accessPolicy: "kit-build/1" as const,
  };
  return deepFreeze({ ...data, sequenceHash: await hash(data) });
}
export async function validateSolidPlan(
  value: SolidPlan,
  fonts?: Partial<Record<LetteringFont, Uint8Array>>,
) {
  if (!value || JSON.stringify(value).length > 2_000_000)
    throw Error("solid/file");
  const expected = await makeSolidPlan(value.source, fonts);
  if (JSON.stringify(value) !== JSON.stringify(expected))
    throw Error("solid/provenance");
  return expected;
}
export function solidPartMesh(
  plan: SolidPlan,
  step: number,
  assembled = false,
) {
  const part = plan.parts[step - 1];
  if (!part) throw Error("solid/step");
  return extrudeSolid(part.polygons, part.heightMm, assembled ? part.zMm : 0);
}
export function solidTemplateSvg(plan: SolidPlan, step: number) {
  const part = plan.parts[step - 1];
  if (!part) throw Error("solid/step");
  const points = part.polygons.flat(2),
    xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]),
    minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys),
    w = Math.max(70, maxX - minX + 20),
    h = maxY - minY + 40;
  const path = part.polygons
    .map((p) =>
      p
        .map(
          (r) =>
            "M" +
            r
              .map(
                (v) =>
                  `${solidRound(10 + v[0] - minX)},${solidRound(20 + maxY - v[1])}`,
              )
              .join("L") +
            "Z",
        )
        .join(""),
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm" data-solid-hash="${plan.sequenceHash}" data-part="${part.id}"><rect width="100%" height="100%" fill="white"/><text x="10" y="10" font-family="sans-serif" font-size="3.5">${part.id} / Z=${part.zMm} mm / H=${part.heightMm} mm</text><path d="${path}" fill="none" stroke="#222" stroke-width=".2"/><path d="M10,${h - 10}h50m-50,-2v4m50,-4v4" fill="none" stroke="#222" stroke-width=".3"/><text x="10" y="${h - 3}" font-size="3.5" font-family="sans-serif">50 mm - 100%</text></svg>`;
}
