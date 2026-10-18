import { hash, deepFreeze } from "./engine";
import { shapeText } from "./mixed-lettering";
import { rasterLettering, type LetteringFont } from "./lettering";
export type BookSource = { kind: "heart" } | { kind: "text"; text: string };
export type BookParams = {
  pageWidthMm: number;
  pageHeightMm: number;
  availableLeaves: number;
  columns: number;
  rows: number;
  artWidthMm: number;
  artHeightMm: number;
  spineMarginMm: number;
  insetMm: number;
  paperThicknessMm: number;
};
export const DEFAULT_BOOK: BookParams = {
  pageWidthMm: 150,
  pageHeightMm: 220,
  availableLeaves: 400,
  columns: 80,
  rows: 80,
  artWidthMm: 120,
  artHeightMm: 120,
  spineMarginMm: 10,
  insetMm: 15,
  paperThicknessMm: 0.1,
};
type Point = [number, number];
export type BookFold = {
  crease: [Point, Point];
  corner: Point;
  reflected: Point;
};
export type BookLeaf = {
  leaf: number;
  pageFace: number;
  column: number;
  lane: number;
  band: [number, number] | null;
  top?: BookFold;
  bottom?: BookFold;
  insetCreaseX?: number;
};
export type BookPlan = {
  schema: "iprasm.book-fold/1";
  method: "bounded-corner-reflection/1";
  source: BookSource;
  params: BookParams;
  sourceHash: string;
  sourceBits: number[];
  lanes: number;
  startLeaf: number;
  leafPitchMm: number;
  leaves: BookLeaf[];
  accessPolicy: "kit-build/1";
  sequenceHash: string;
};
const rounded = (n: number) => Math.round(n * 1000000) / 1000000;
export function reflectPoint(point: Point, a: Point, b: Point): Point {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    length = dx * dx + dy * dy;
  if (!length) throw Error("book/geometry");
  const t = ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / length;
  return [
    rounded(2 * (a[0] + t * dx) - point[0]),
    rounded(2 * (a[1] + t * dy) - point[1]),
  ];
}
function checkParams(p: BookParams) {
  if (
    !p ||
    Object.keys(p).sort().join() !== Object.keys(DEFAULT_BOOK).sort().join() ||
    Object.values(p).some((v) => !Number.isFinite(v)) ||
    p.pageWidthMm < 80 ||
    p.pageWidthMm > 300 ||
    p.pageHeightMm < 120 ||
    p.pageHeightMm > 400 ||
    !Number.isInteger(p.availableLeaves) ||
    p.availableLeaves < 40 ||
    p.availableLeaves > 1000 ||
    !Number.isInteger(p.columns) ||
    p.columns < 32 ||
    p.columns > 160 ||
    !Number.isInteger(p.rows) ||
    p.rows < 32 ||
    p.rows > 160 ||
    p.artHeightMm < 40 ||
    p.artHeightMm > p.pageHeightMm - 20 ||
    p.artHeightMm / p.rows < 1 ||
    p.artWidthMm < 50 ||
    p.artWidthMm > p.pageWidthMm * 2 - 20 ||
    p.spineMarginMm < 5 ||
    p.spineMarginMm > p.pageWidthMm / 3 ||
    p.insetMm < 5 ||
    p.insetMm > (p.pageWidthMm - p.spineMarginMm) / 2 ||
    p.paperThicknessMm < 0.05 ||
    p.paperThicknessMm > 0.3
  )
    throw Error("book/materials");
}
async function artwork(
  source: BookSource,
  p: BookParams,
  fonts?: Partial<Record<LetteringFont, Uint8Array>>,
) {
  const size = Math.max(p.columns, p.rows),
    bits: number[] = [];
  if (source.kind === "heart") {
    if (Object.keys(source).join() !== "kind") throw Error("book/source");
    for (let y = 0; y < p.rows; y++)
      for (let x = 0; x < p.columns; x++) {
        const xx = ((x + 0.5) / p.columns - 0.5) * 2.5,
          yy = (0.5 - (y + 0.5) / p.rows) * 2.5 + 0.15;
        bits.push(+((xx * xx + yy * yy - 1) ** 3 - xx * xx * yy ** 3 <= 0));
      }
  } else if (source.kind === "text") {
    if (
      Object.keys(source).sort().join() !== "kind,text" ||
      typeof source.text !== "string" ||
      [...source.text].length > 24
    )
      throw Error("book/source");
    const geometry = await shapeText(
      source.text,
      { widthMm: p.artWidthMm, heightMm: p.artHeightMm, shape: "rectangle" },
      fonts,
    );
    if (source.text !== geometry.text) throw Error("book/source");
    const rgb = rasterLettering(geometry, size);
    for (let y = 0; y < p.rows; y++)
      for (let x = 0; x < p.columns; x++) {
        const k =
          (Math.floor(((y + 0.5) / p.rows) * size) * size +
            Math.floor(((x + 0.5) / p.columns) * size)) *
          3;
        bits.push(+(rgb[k] < 128));
      }
  } else throw Error("book/source");
  return bits;
}
function cornerFold(
  width: number,
  height: number,
  mark: number,
  margin: number,
  bottom: boolean,
): BookFold {
  const distance = bottom ? height - mark : mark,
    depth = Math.min(distance, (width - margin) / 2);
  if (distance < 2 || depth < 2) throw Error("book/geometry");
  const a: Point = [width, mark],
    b: Point = [width - depth, bottom ? height : 0],
    corner: Point = [width, bottom ? height : 0],
    reflected = reflectPoint(corner, a, b);
  if (
    reflected[0] < margin - 1e-5 ||
    reflected[0] > width ||
    reflected[1] < 0 ||
    reflected[1] > height ||
    (bottom ? reflected[1] < mark - 1e-5 : reflected[1] > mark + 1e-5)
  )
    throw Error("book/geometry");
  return { crease: [a, b], corner, reflected };
}
export async function makeBookPlan(
  source: BookSource,
  params: BookParams = DEFAULT_BOOK,
  fonts?: Partial<Record<LetteringFont, Uint8Array>>,
): Promise<BookPlan> {
  checkParams(params);
  const p = { ...params },
    bits = await artwork(source, p, fonts),
    columns: [number, number][][] = [];
  if (!bits.includes(1)) throw Error("book/empty");
  for (let x = 0; x < p.columns; x++) {
    const bands: [number, number][] = [];
    for (let y = 0; y < p.rows;) {
      if (!bits[y * p.columns + x]) {
        y++;
        continue;
      }
      const top = y;
      while (y < p.rows && bits[y * p.columns + x]) y++;
      bands.push([
        rounded(
          (p.pageHeightMm - p.artHeightMm) / 2 + (top / p.rows) * p.artHeightMm,
        ),
        rounded(
          (p.pageHeightMm - p.artHeightMm) / 2 + (y / p.rows) * p.artHeightMm,
        ),
      ]);
    }
    columns.push(bands);
  }
  const lanes = Math.max(...columns.map((c) => c.length)),
    required = lanes * p.columns;
  if (
    lanes > 8 ||
    required > p.availableLeaves ||
    p.artWidthMm / required < p.paperThicknessMm * 2
  )
    throw Error("book/leaves");
  const startLeaf = Math.floor((p.availableLeaves - required) / 2) + 1,
    leaves: BookLeaf[] = [];
  columns.forEach((bands, column) => {
    for (let lane = 0; lane < lanes; lane++) {
      const band = bands.length ? bands[lane % bands.length] : null,
        leaf = startLeaf + leaves.length;
      leaves.push({
        leaf,
        pageFace: leaf * 2 - 1,
        column,
        lane,
        band,
        ...(band
          ? {
              top: cornerFold(
                p.pageWidthMm,
                p.pageHeightMm,
                band[0],
                p.spineMarginMm,
                false,
              ),
              bottom: cornerFold(
                p.pageWidthMm,
                p.pageHeightMm,
                band[1],
                p.spineMarginMm,
                true,
              ),
            }
          : { insetCreaseX: p.pageWidthMm - p.insetMm }),
      });
    }
  });
  const data = {
    schema: "iprasm.book-fold/1" as const,
    method: "bounded-corner-reflection/1" as const,
    source,
    params: p,
    sourceHash: await hash({ source, columns: p.columns, rows: p.rows, bits }),
    sourceBits: bits,
    lanes,
    startLeaf,
    leafPitchMm: p.artWidthMm / required,
    leaves,
    accessPolicy: "kit-build/1" as const,
  };
  return deepFreeze({ ...data, sequenceHash: await hash(data) });
}
export async function validateBookPlan(
  value: BookPlan,
  fonts?: Partial<Record<LetteringFont, Uint8Array>>,
) {
  if (!value || JSON.stringify(value).length > 2_000_000)
    throw Error("book/file");
  const expected = await makeBookPlan(value.source, value.params, fonts);
  if (JSON.stringify(value) !== JSON.stringify(expected))
    throw Error("book/provenance");
  return expected;
}
export function bookElevationSvg(g: BookPlan) {
  const width = g.params.artWidthMm,
    height = g.params.pageHeightMm,
    pitch = g.leafPitchMm;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}mm" height="${height}mm" data-book-hash="${g.sequenceHash}"><rect width="100%" height="100%" fill="#263a32"/>${g.leaves.map((leaf, i) => (leaf.band ? `<rect x="${i * pitch}" y="${leaf.band[0]}" width="${pitch * 0.9}" height="${leaf.band[1] - leaf.band[0]}" fill="#fff9df"/>` : "")).join("")}</svg>`;
}
export function bookLeafSvg(g: BookPlan, step: number) {
  const leaf = g.leaves[step - 1];
  if (!leaf) throw Error("book/step");
  const p = g.params,
    point = (v: Point) => v.join(",");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-5 -5 ${p.pageWidthMm + 10} ${p.pageHeightMm + 25}" width="${p.pageWidthMm + 10}mm" height="${p.pageHeightMm + 25}mm" data-book-hash="${g.sequenceHash}" data-step="${step}"><rect width="${p.pageWidthMm}" height="${p.pageHeightMm}" fill="#fff9df" stroke="#555" stroke-width=".5"/><path d="M${p.spineMarginMm},0V${p.pageHeightMm}" stroke="#777" stroke-dasharray="2 2"/>${leaf.band ? [leaf.top!, leaf.bottom!].map((f) => `<path d="M${point(f.crease[0])}L${point(f.crease[1])}L${point(f.reflected)}Z" fill="#dcece1" stroke="#496f57" stroke-width=".4"/><path d="M${point(f.crease[0])}L${point(f.crease[1])}" stroke="#c0422c" stroke-width=".7" stroke-dasharray="2 1"/>`).join("") : `<path d="M${leaf.insetCreaseX},0V${p.pageHeightMm}" stroke="#c0422c" stroke-width=".7" stroke-dasharray="2 1"/>`}<path d="M5,${p.pageHeightMm + 8}h50m-50,-2v4m50,-4v4" fill="none" stroke="#222" stroke-width=".3"/><text x="5" y="${p.pageHeightMm + 16}" font-family="sans-serif" font-size="3.5">50 mm - 100%</text></svg>`;
}
export function bookCsv(g: BookPlan) {
  return [
    "step,leaf,odd_page_face,top_from_top_mm,bottom_from_top_mm,top_edge_depth_mm,bottom_edge_depth_mm,inset_from_foreedge_mm",
    ...g.leaves.map((l, i) =>
      [
        i + 1,
        l.leaf,
        l.pageFace,
        ...(l.band
          ? [
              l.band[0],
              l.band[1],
              g.params.pageWidthMm - l.top!.crease[1][0],
              g.params.pageWidthMm - l.bottom!.crease[1][0],
              "",
            ]
          : ["", "", "", "", g.params.insetMm]),
      ].join(","),
    ),
  ].join("\n");
}
