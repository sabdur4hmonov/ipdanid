import QRCode from "qrcode";
import { deepFreeze, hash } from "./engine";
export const QR_MATERIAL = {
  version: "perforated-qr/1",
  moduleMm: 5.6,
  rowsPerModule: 4,
  threadMm: 1.4,
  threadType: "flat-ribbon",
  lineCap: "butt",
  holeMm: 0.6,
  boardThicknessMm: 1,
  quietModules: 4,
} as const;
export type QrPoint = { id: number; x: number; y: number };
export type QrMove = { from: number; to: number; side: "front" | "back" };
export type QrCraft = {
  schema: "iprasm.qr-stitch/1";
  payload: string;
  correction: "H";
  matrixSize: number;
  material: typeof QR_MATERIAL;
  widthMm: number;
  holes: QrPoint[];
  moves: QrMove[];
  threadMetres: number;
  sequenceHash: string;
};
const mm = (n: number) => Math.round(n * 10000) / 10000;
function draft(payload: string) {
  if (
    typeof payload !== "string" ||
    !payload.trim() ||
    /[\p{Cc}\p{Cf}]/u.test(payload) ||
    new TextEncoder().encode(payload).length > 80
  )
    throw Error("qr/payload");
  const qr = QRCode.create(payload, { errorCorrectionLevel: "H" });
  if (qr.version > 5) throw Error("qr/capacity");
  const n = qr.modules.size,
    material = QR_MATERIAL,
    module = material.moduleMm,
    pitch = module / material.rowsPerModule;
  const holes: QrPoint[] = [],
    moves: QrMove[] = [];
  // A different physical product: one uncut thread passes THROUGH a white,
  // perforated sheet. Transfers stay on the back; they are never hidden front
  // chords or a source-image overlay. Ordinary 240-nail kits cannot make this.
  for (let y = 0; y < n; y++)
    for (let row = 0; row < material.rowsPerModule; row++) {
      const reverse = (y * material.rowsPerModule + row) % 2 === 1;
      const runs: [number, number][] = [];
      for (let x = 0; x < n;) {
        if (!qr.modules.get(y, x)) {
          x++;
          continue;
        }
        const start = x;
        while (x < n && qr.modules.get(y, x)) x++;
        runs.push([start, x]);
      }
      if (reverse) runs.reverse();
      for (const [start, end] of runs) {
        const left = mm((start + material.quietModules) * module),
          right = mm((end + material.quietModules) * module),
          cy = mm((y + material.quietModules) * module + (row + 0.5) * pitch);
        const a = holes.length,
          b = a + 1;
        holes.push(
          { id: a, x: reverse ? right : left, y: cy },
          { id: b, x: reverse ? left : right, y: cy },
        );
        if (a) moves.push({ from: a - 1, to: a, side: "back" });
        moves.push({ from: a, to: b, side: "front" });
      }
    }
  if (holes.length > 8000 || !moves.length) throw Error("qr/capacity");
  const length =
    moves.reduce(
      (sum, m) =>
        sum +
        Math.hypot(
          holes[m.from].x - holes[m.to].x,
          holes[m.from].y - holes[m.to].y,
        ),
      0,
    ) +
    (holes.length - 2) * material.boardThicknessMm +
    500;
  return {
    schema: "iprasm.qr-stitch/1" as const,
    payload,
    correction: "H" as const,
    matrixSize: n,
    material,
    widthMm: mm((n + 8) * module),
    holes,
    moves,
    threadMetres: mm(length / 1000),
  };
}
export async function makeQrCraft(payload: string): Promise<QrCraft> {
  const d = draft(payload);
  return deepFreeze({ ...d, sequenceHash: await hash(d) });
}
export async function validateQrCraft(value: QrCraft) {
  if (
    !value ||
    typeof value !== "object" ||
    JSON.stringify(value).length > 1_600_000
  )
    throw Error("qr/file");
  const expected = await makeQrCraft(value.payload);
  if (
    Object.keys(value).sort().join() !== Object.keys(expected).sort().join() ||
    JSON.stringify({ ...value, sequenceHash: undefined }) !==
      JSON.stringify({ ...expected, sequenceHash: undefined }) ||
    value.sequenceHash !== expected.sequenceHash
  )
    throw Error("qr/provenance");
  return expected;
}
export function qrCraftSvg(g: QrCraft, template = false) {
  const width = g.widthMm,
    height = template ? width + 20 : width;
  const content = template
    ? g.holes
        .map(
          (p) =>
            `<circle cx="${p.x}" cy="${p.y}" r="${g.material.holeMm / 2}" fill="none" stroke="#111" stroke-width=".1"/>`,
        )
        .join("") +
      `<path d="M5,${width + 7}h50" stroke="#000" stroke-width=".25"/><text x="5" y="${width + 14}" font-size="4">50 mm</text>`
    : `<path fill="#000" d="${g.moves
        .filter((m) => m.side === "front")
        .map((m) => {
          const a = g.holes[m.from],
            b = g.holes[m.to],
            x = Math.min(a.x, b.x),
            y = a.y - g.material.threadMm / 2,
            w = Math.abs(a.x - b.x);
          return `M${x},${y}h${w}v${g.material.threadMm}h${-w}Z`;
        })
        .join("")}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}" data-qr-hash="${g.sequenceHash}"><rect width="100%" height="100%" fill="#fff"/>${content}</svg>`;
}
export function drawQrCraft(
  ctx: CanvasRenderingContext2D,
  g: QrCraft,
  through = g.moves.length,
  back = false,
) {
  const size = ctx.canvas.width;
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, size, ctx.canvas.height);
  ctx.save();
  ctx.scale(size / g.widthMm, size / g.widthMm);
  ctx.fillStyle = "black";
  // Fill the union of actual flat-ribbon footprints once. Separate source-over
  // edge antialiasing creates grey seams between touching opaque bands.
  ctx.beginPath();
  for (const m of g.moves.slice(0, through)) {
    if ((m.side === "back") !== back) continue;
    const a = g.holes[m.from],
      b = g.holes[m.to];
    if (back) {
      // Back transfers can be diagonal; their rectangular ribbon footprint is
      // drawn with a butt-capped stroke in a separate explicit back view.
      continue;
    }
    ctx.rect(
      Math.min(a.x, b.x),
      a.y - g.material.threadMm / 2,
      Math.abs(b.x - a.x),
      g.material.threadMm,
    );
  }
  ctx.fill();
  if (back) {
    ctx.beginPath();
    ctx.lineCap = "butt";
    ctx.lineWidth = g.material.threadMm;
    ctx.strokeStyle = "black";
    for (const m of g.moves
      .slice(0, through)
      .filter((m) => m.side === "back")) {
      const a = g.holes[m.from],
        b = g.holes[m.to];
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
  }
  ctx.restore();
}
export function qrCraftCsv(g: QrCraft) {
  return [
    "step,side,from_hole,to_hole,from_x_mm,from_y_mm,to_x_mm,to_y_mm",
    ...g.moves.map((m, i) => {
      const a = g.holes[m.from],
        b = g.holes[m.to];
      return [i + 1, m.side, a.id + 1, b.id + 1, a.x, a.y, b.x, b.y].join(",");
    }),
  ].join("\n");
}
