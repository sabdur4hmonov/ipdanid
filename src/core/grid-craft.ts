import { hash, deepFreeze } from "./engine";
export type GridKind = "mosaic" | "diamond";
export interface GridColor {
  code: string;
  hex: string;
  stock: number;
}
export interface GridProfile {
  kind: GridKind;
  pitchMm: number;
  sparePercent: number;
  palette: GridColor[];
  provisional: true;
}
export interface GridGuide {
  schema: "iprasm.grid/1";
  algorithm: "inventory-regret-linear-rgb/1";
  id: string;
  createdAt: string;
  columns: number;
  rows: number;
  profile: GridProfile;
  cells: number[];
  manualEdit?: { parentSequenceHash: string; cell: number; color: number };
  order: "serpentine-top-left/1";
  sourceHash: string;
  sequenceHash: string;
}
export interface GridProject {
  id: string;
  name: string;
  guide: GridGuide;
  progress: { sequenceHash: string; confirmed: number; revision: number };
  layout?: MosaicLayout;
}
export type MosaicLayout = {
  version: "mosaic-baseplates/1";
  sequenceHash: string;
  columns: number;
  rows: number;
  stock: number;
  hash: string;
};
export async function mosaicLayout(
  g: GridGuide,
  columns: number,
  rows: number,
  stock: number,
): Promise<MosaicLayout> {
  if (
    g.profile.kind !== "mosaic" ||
    !Number.isInteger(columns) ||
    !Number.isInteger(rows) ||
    columns < 4 ||
    rows < 4 ||
    columns > 48 ||
    rows > 48 ||
    !Number.isSafeInteger(stock) ||
    stock < 0 ||
    stock > 100000
  )
    throw Error("Invalid baseplate materials");
  const required = Math.ceil(g.columns / columns) * Math.ceil(g.rows / rows);
  if (required > 64) throw Error("Use larger baseplates (maximum64)");
  if (required > stock) throw Error("Insufficient baseplates");
  const payload = {
    version: "mosaic-baseplates/1" as const,
    sequenceHash: g.sequenceHash,
    columns,
    rows,
    stock,
  };
  return deepFreeze({ ...payload, hash: await hash(JSON.stringify(payload)) });
}
const HEX = /^#[0-9a-f]{6}$/i,
  DIGEST = /^[0-9a-f]{64}$/;
export const MAX_GRID_CELLS = 96 * 96;
export function checkGridProfile(p: GridProfile) {
  if (
    !p ||
    !["mosaic", "diamond"].includes(p.kind) ||
    p.provisional !== true ||
    !Number.isFinite(p.pitchMm) ||
    p.pitchMm < 1 ||
    p.pitchMm > 20 ||
    !Number.isInteger(p.sparePercent) ||
    p.sparePercent < 0 ||
    p.sparePercent > 50 ||
    !Array.isArray(p.palette) ||
    p.palette.length < 2 ||
    p.palette.length > 32
  )
    throw Error("Invalid grid materials");
  const codes = new Set<string>();
  for (const c of p.palette) {
    if (
      !c ||
      !/^[A-Za-z0-9][A-Za-z0-9_-]{0,11}$/.test(c.code) ||
      codes.has(c.code) ||
      !HEX.test(c.hex) ||
      !Number.isSafeInteger(c.stock) ||
      c.stock < 0 ||
      c.stock > 1_000_000
    )
      throw Error("Invalid palette or inventory");
    codes.add(c.code);
  }
}
export function dimensions(columns: number, rows: number) {
  if (
    !Number.isInteger(columns) ||
    !Number.isInteger(rows) ||
    columns < 4 ||
    rows < 4 ||
    columns > 96 ||
    rows > 96 ||
    columns * rows > MAX_GRID_CELLS
  )
    throw Error("Grid dimensions must be 4..96");
}
export function gridPayload(g: GridGuide) {
  return JSON.stringify({
    schema: g.schema,
    algorithm: g.algorithm,
    columns: g.columns,
    rows: g.rows,
    profile: g.profile,
    cells: g.cells,
    order: g.order,
    sourceHash: g.sourceHash,
    ...(g.manualEdit ? { manualEdit: g.manualEdit } : {}),
  });
}
export function gridCounts(g: GridGuide) {
  return g.profile.palette.map((c, index) => {
    const used = g.cells.reduce((n, v) => n + +(v === index), 0),
      spares = Math.ceil((used * g.profile.sparePercent) / 100);
    return { ...c, used, spares, required: used + spares };
  });
}
export async function validateGrid(g: GridGuide) {
  if (
    !g ||
    g.schema !== "iprasm.grid/1" ||
    g.algorithm !== "inventory-regret-linear-rgb/1" ||
    g.order !== "serpentine-top-left/1" ||
    typeof g.id !== "string" ||
    g.id.length > 100 ||
    !Number.isFinite(Date.parse(g.createdAt)) ||
    !DIGEST.test(g.sourceHash) ||
    !DIGEST.test(g.sequenceHash)
  )
    throw Error("Invalid grid guide");
  dimensions(g.columns, g.rows);
  checkGridProfile(g.profile);
  if (
    !Array.isArray(g.cells) ||
    g.cells.length !== g.columns * g.rows ||
    g.cells.some(
      (v) => !Number.isInteger(v) || v < 0 || v >= g.profile.palette.length,
    )
  )
    throw Error("Invalid grid cells");
  if (
    g.manualEdit &&
    (!DIGEST.test(g.manualEdit.parentSequenceHash) ||
      !Number.isInteger(g.manualEdit.cell) ||
      g.manualEdit.cell < 0 ||
      g.manualEdit.cell >= g.cells.length ||
      g.cells[g.manualEdit.cell] !== g.manualEdit.color)
  )
    throw Error("Invalid manual edit provenance");
  if (gridCounts(g).some((c) => c.required > c.stock))
    throw Error("Grid exceeds declared inventory including spares");
  if ((await hash(gridPayload(g))) !== g.sequenceHash)
    throw Error("Grid sequence hash mismatch");
  return deepFreeze(g);
}
export function gridCell(g: GridGuide, step: number) {
  if (!Number.isInteger(step) || step < 1 || step > g.cells.length)
    throw Error("Invalid grid step");
  const row = Math.floor((step - 1) / g.columns),
    offset = (step - 1) % g.columns,
    column = row % 2 ? g.columns - 1 - offset : offset,
    index = row * g.columns + column;
  return {
    step,
    row: row + 1,
    column: column + 1,
    index,
    color: g.profile.palette[g.cells[index]],
    symbol: gridSymbol(g.cells[index]),
  };
}
export function gridSymbol(index: number) {
  return "ABCDEFGHIJKLMNOPQRSTUVWXYZ012345"[index];
}
const linear = (n: number) => {
  const v = n / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const rgb = (hex: string) =>
  [1, 3, 5].map((k) => linear(parseInt(hex.slice(k, k + 2), 16)));
export async function generateGrid(
  pixels: Uint8Array,
  columns: number,
  rows: number,
  profile: GridProfile,
): Promise<GridGuide> {
  dimensions(columns, rows);
  checkGridProfile(profile);
  if (pixels.length !== columns * rows * 3) throw Error("Invalid grid target");
  const capacity = profile.palette.map((c) =>
    Math.floor(c.stock / (1 + profile.sparePercent / 100)),
  );
  if (capacity.reduce((s, n) => s + n, 0) < columns * rows)
    throw Error("Insufficient inventory including spares");
  const colors = profile.palette.map((c) => rgb(c.hex)),
    weight = [0.2126, 0.7152, 0.0722];
  const choices = Array.from({ length: columns * rows }, (_, index) => {
    const target = [0, 1, 2].map((k) => linear(pixels[index * 3 + k])),
      rank = colors
        .map((c, color) => ({
          color,
          error: c.reduce((s, v, k) => s + weight[k] * (v - target[k]) ** 2, 0),
        }))
        .sort((a, b) => a.error - b.error || a.color - b.color);
    return { index, rank, regret: rank[1].error - rank[0].error };
  });
  choices.sort((a, b) => b.regret - a.regret || a.index - b.index);
  const cells = new Array<number>(columns * rows);
  for (const choice of choices) {
    const pick = choice.rank.find((c) => capacity[c.color] > 0);
    if (!pick) throw Error("Insufficient inventory");
    cells[choice.index] = pick.color;
    capacity[pick.color]--;
  }
  const sourceHash = await hash(Array.from(pixels).join(",")),
    g: GridGuide = {
      schema: "iprasm.grid/1",
      algorithm: "inventory-regret-linear-rgb/1",
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      columns,
      rows,
      profile: structuredClone(profile),
      cells,
      order: "serpentine-top-left/1",
      sourceHash,
      sequenceHash: "",
    };
  g.sequenceHash = await hash(gridPayload(g));
  return validateGrid(g);
}
export async function replaceGridCell(
  g: GridGuide,
  index: number,
  color: number,
) {
  await validateGrid(g);
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= g.cells.length ||
    !Number.isInteger(color) ||
    color < 0 ||
    color >= g.profile.palette.length
  )
    throw Error("Invalid cell edit");
  if (g.cells[index] === color)
    throw Error("Choose a different replacement color");
  const next = structuredClone(g);
  next.manualEdit = { parentSequenceHash: g.sequenceHash, cell: index, color };
  next.id = crypto.randomUUID();
  next.createdAt = new Date().toISOString();
  next.cells[index] = color;
  next.sequenceHash = await hash(gridPayload(next));
  return validateGrid(next);
}
export function newGridProject(g: GridGuide, name: string): GridProject {
  return {
    id: crypto.randomUUID(),
    name: name.trim().slice(0, 80) || "Grid craft",
    guide: g,
    progress: { sequenceHash: g.sequenceHash, confirmed: 0, revision: 0 },
  };
}
export async function validateGridProject(p: GridProject) {
  if (
    !p ||
    typeof p.id !== "string" ||
    p.id.length > 100 ||
    typeof p.name !== "string" ||
    !p.name.trim() ||
    p.name.length > 80
  )
    throw Error("Invalid grid project");
  await validateGrid(p.guide);
  if (p.layout) {
    const expected = await mosaicLayout(
      p.guide,
      p.layout.columns,
      p.layout.rows,
      p.layout.stock,
    );
    if (
      p.layout.version !== expected.version ||
      p.layout.sequenceHash !== expected.sequenceHash ||
      p.layout.hash !== expected.hash ||
      Object.keys(p.layout).some((k) => !Object.keys(expected).includes(k))
    )
      throw Error("Invalid baseplate layout provenance");
  }
  const x = p.progress;
  if (
    !x ||
    x.sequenceHash !== p.guide.sequenceHash ||
    !Number.isSafeInteger(x.confirmed) ||
    x.confirmed < 0 ||
    x.confirmed > p.guide.cells.length ||
    !Number.isSafeInteger(x.revision) ||
    x.revision < 0
  )
    throw Error("Invalid grid progress");
  return p;
}
export async function parseGridProject(raw: string) {
  if (raw.length > 2_000_000) throw Error("Grid file exceeds limit");
  const data = JSON.parse(raw);
  if (
    !["iprasm.grid-project/1", "iprasm.grid-project/2"].includes(data.schema) ||
    (data.schema === "iprasm.grid-project/2") !== !!data.project?.layout
  )
    throw Error("Unsupported grid file");
  const p = await validateGridProject(data.project);
  return { ...p, id: crypto.randomUUID() };
}
export function gridFile(p: GridProject) {
  return JSON.stringify(
    {
      schema: p.layout ? "iprasm.grid-project/2" : "iprasm.grid-project/1",
      project: p,
    },
    null,
    2,
  );
}
export function gridCsv(g: GridGuide) {
  const rows = ["step,row,column,symbol,color,hex"];
  for (let s = 1; s <= g.cells.length; s++) {
    const c = gridCell(g, s);
    rows.push(
      [s, c.row, c.column, c.symbol, c.color.code, c.color.hex].join(","),
    );
  }
  return rows.join("\n");
}
export function gridSvg(g: GridGuide) {
  const w = g.columns * g.profile.pitchMm,
    h = g.rows * g.profile.pitchMm;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${g.columns} ${g.rows}" data-sequence-hash="${g.sequenceHash}"><title>Exact physical grid; verify print scale and materials</title>${g.cells
    .map((v, k) => {
      const x = k % g.columns,
        y = Math.floor(k / g.columns),
        color = g.profile.palette[v].hex;
      return g.profile.kind === "mosaic"
        ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}" stroke="#777" stroke-width=".025"/>`
        : `<rect x="${x}" y="${y}" width="1" height="1" fill="#fff"/><circle cx="${x + 0.5}" cy="${y + 0.5}" r=".45" fill="${color}"/>`;
    })
    .join("")}</svg>`;
}
