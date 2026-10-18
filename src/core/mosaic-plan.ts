import { gridCell, gridCounts, type GridProject } from "./grid-craft";
export const EXTENDED_GRID_COLORS = [
  "#faf8ef",
  "#18201d",
  "#888888",
  "#a43e40",
  "#d7a543",
  "#1e526f",
  "#3a7358",
  "#b99378",
  "#e8c7af",
  "#513e61",
  "#608fa4",
  "#cab8da",
  "#ffffff",
  "#444444",
  "#c96b52",
  "#e8ac76",
  "#f1d88d",
  "#8da76f",
  "#264736",
  "#9cbcc2",
  "#303e60",
  "#8b607c",
  "#744d37",
  "#d5a8ac",
] as const;
export function mosaicPlan(p: GridProject) {
  const g = p.guide,
    layout = p.layout;
  if (
    !layout ||
    g.profile.kind !== "mosaic" ||
    layout.sequenceHash !== g.sequenceHash
  )
    throw Error("Baseplate layout required");
  const across = Math.ceil(g.columns / layout.columns),
    down = Math.ceil(g.rows / layout.rows);
  const plates = Array.from({ length: across * down }, (_, i) => ({
    id: `${String.fromCharCode(65 + Math.floor(i / across))}${(i % across) + 1}`,
    row: Math.floor(i / across),
    column: i % across,
    steps: [] as {
      step: number;
      row: number;
      column: number;
      code: string;
      symbol: string;
      hex: string;
    }[],
    counts: g.profile.palette.map((c) => ({
      code: c.code,
      hex: c.hex,
      used: 0,
    })),
    confirmed: 0,
  }));
  const steps = Array.from({ length: g.cells.length }, (_, i) => {
    const cell = gridCell(g, i + 1),
      plate =
        plates[
          Math.floor((cell.row - 1) / layout.rows) * across +
            Math.floor((cell.column - 1) / layout.columns)
        ];
    const step = {
      step: cell.step,
      row: ((cell.row - 1) % layout.rows) + 1,
      column: ((cell.column - 1) % layout.columns) + 1,
      code: cell.color.code,
      symbol: cell.symbol,
      hex: cell.color.hex,
    };
    plate.steps.push(step);
    plate.counts[g.cells[cell.index]].used++;
    plate.confirmed += +(cell.step <= p.progress.confirmed);
    return {
      ...step,
      plate: plate.id,
      globalRow: cell.row,
      globalColumn: cell.column,
    };
  });
  return {
    schema: "iprasm.mosaic-plan/1",
    sequenceHash: g.sequenceHash,
    layoutHash: layout.hash,
    plateColumns: layout.columns,
    plateRows: layout.rows,
    required: plates.length,
    stock: layout.stock,
    pictureWidthMm: g.columns * g.profile.pitchMm,
    pictureHeightMm: g.rows * g.profile.pitchMm,
    boardWidthMm: across * layout.columns * g.profile.pitchMm,
    boardHeightMm: down * layout.rows * g.profile.pitchMm,
    unusedStuds: plates.length * layout.columns * layout.rows - g.cells.length,
    inventory: gridCounts(g),
    plates,
    steps,
  };
}
export function mosaicPlanSvg(p: GridProject) {
  const plan = mosaicPlan(p),
    g = p.guide,
    pitch = g.profile.pitchMm,
    w = plan.boardWidthMm,
    h = plan.boardHeightMm;
  const rect = (
    x: number,
    y: number,
    width: number,
    height: number,
    fill: string,
    stroke: string,
    sw: number,
  ) =>
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(w, 65)}mm" height="${h + 22}mm" viewBox="0 0 ${Math.max(w, 65)} ${h + 22}" data-sequence-hash="${plan.sequenceHash}" data-layout-hash="${plan.layoutHash}"><title>Baseplates: unassigned studs remain blank. Print100%.</title>${rect(0, 0, w, h, "#eee", "#555", 0.3)}${g.cells.map((v, i) => rect((i % g.columns) * pitch, Math.floor(i / g.columns) * pitch, pitch, pitch, g.profile.palette[v].hex, "#888", 0.1)).join("")}${plan.plates.map((plate) => rect(plate.column * p.layout!.columns * pitch, plate.row * p.layout!.rows * pitch, p.layout!.columns * pitch, p.layout!.rows * pitch, "none", "#173552", 0.7)).join("")}<path d="M5 ${h + 10}h50m-50 -2v4m50 -4v4" stroke="#000" fill="none" stroke-width=".3"/><text x="5" y="${h + 18}" font-size="4">50 mm</text></svg>`;
}
