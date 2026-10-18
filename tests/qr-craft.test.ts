import { expect, it } from "vitest";
import jsQR from "jsqr";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { qrCraftPdf } from "../src/core/qr-craft-pdf";
import {
  makeQrCraft,
  qrCraftCsv,
  qrCraftSvg,
  validateQrCraft,
  type QrCraft,
} from "../src/core/qr-craft";
// Independent analytic raster of only the real front thread segments. No QR
// module rectangles, payload image, target pixels or decoder data are drawn.
export function qrPhysicalRaster(g: QrCraft, size = 840) {
  const data = new Uint8ClampedArray(size * size * 4).fill(255),
    scale = size / g.widthMm,
    radius = (g.material.threadMm * scale) / 2;
  for (const m of g.moves.filter((m) => m.side === "front")) {
    const a = g.holes[m.from],
      b = g.holes[m.to],
      x0 = Math.min(a.x, b.x) * scale,
      x1 = Math.max(a.x, b.x) * scale,
      y = a.y * scale;
    for (
      let py = Math.max(0, Math.floor(y - radius));
      py <= Math.min(size - 1, Math.ceil(y + radius));
      py++
    )
      for (
        let px = Math.max(0, Math.floor(x0 - radius));
        px <= Math.min(size - 1, Math.ceil(x1 + radius));
        px++
      ) {
        const dx = Math.max(x0 - (px + 0.5), 0, px + 0.5 - x1),
          dy = py + 0.5 - y;
        if (dx > 0 || Math.abs(dy) > radius) continue;
        const k = (py * size + px) * 4;
        data[k] = data[k + 1] = data[k + 2] = 0;
      }
  }
  return data;
}
it("decodes actual continuous thread coverage for text, link and Cyrillic payloads", async () => {
  for (const payload of [
    "IP RASM 2026",
    "https://example.com/gift",
    "Salom Мир",
  ]) {
    const g = await makeQrCraft(payload),
      image = qrPhysicalRaster(g);
    expect(jsQR(image, 840, 840)?.data).toBe(payload);
    expect(g.correction).toBe("H");
    expect(g.material.quietModules).toBe(4);
    expect(g.moves.length).toBe(g.holes.length - 1);
    for (let i = 0; i < g.moves.length; i++) {
      expect(g.moves[i]).toEqual({
        from: i,
        to: i + 1,
        side: i % 2 ? "back" : "front",
      });
    }
    const quietPx = Math.floor(((4 * g.material.moduleMm) / g.widthMm) * 840);
    expect(image.slice(0, quietPx * 840 * 4).every((v) => v === 255)).toBe(
      true,
    );
    expect(qrCraftCsv(g).split("\n")).toHaveLength(g.moves.length + 1);
    expect(qrCraftSvg(g)).not.toContain("<text");
    expect(qrCraftSvg(g, true)).toContain("50 mm");
  }
});
it("keeps all custom holes distinct, spaced and inside the four-module margin, with exact thread consumption", async () => {
  const g = await makeQrCraft("IP RASM 2026"),
    seen = new Set<string>();
  let min = Infinity;
  for (const a of g.holes) {
    const k = [a.x, a.y].join();
    expect(seen.has(k)).toBe(false);
    seen.add(k);
    expect(a.x).toBeGreaterThanOrEqual(4 * 5.6);
    expect(a.y).toBeGreaterThan(4 * 5.6);
    for (const b of g.holes.slice(a.id + 1))
      min = Math.min(min, Math.hypot(a.x - b.x, a.y - b.y));
  }
  expect(min).toBeGreaterThanOrEqual(1.1999);
  const length =
    g.moves.reduce(
      (n, m) =>
        n +
        Math.hypot(
          g.holes[m.from].x - g.holes[m.to].x,
          g.holes[m.from].y - g.holes[m.to].y,
        ),
      0,
    ) +
    (g.holes.length - 2) +
    500;
  expect(g.threadMetres).toBeCloseTo(length / 1000, 4);
});
it("rejects unsupported payloads and forged geometry, hidden transfers, material or sequence edits", async () => {
  for (const payload of [
    "",
    "  ",
    "secret\nvalue",
    "x".repeat(81),
    "x".repeat(60),
  ])
    await expect(makeQrCraft(payload)).rejects.toThrow(/qr\//);
  const g = await makeQrCraft("Test");
  expect(
    (await validateQrCraft(JSON.parse(JSON.stringify(g)))).sequenceHash,
  ).toBe(g.sequenceHash);
  for (const change of [
    (x: QrCraft) => (x.moves[1].side = "front"),
    (x: QrCraft) => x.holes[0].x++,
    (x: QrCraft) => ((x.material as any).threadMm = 0.12),
    (x: QrCraft) => (x.payload = "Changed"),
  ]) {
    const bad = structuredClone(g);
    change(bad);
    await expect(validateQrCraft(bad)).rejects.toThrow(/qr\/provenance/);
  }
});
it("exports exact full-size and A4 hole templates with a sequence-bound localized step PDF", async () => {
  const g = await makeQrCraft("IP RASM 2026"),
    bytes = await qrCraftPdf(
      g,
      "uz-Cyrl",
      new Uint8Array(readFileSync("public/fonts/NotoSans-Regular.ttf")),
    ),
    doc = await PDFDocument.load(bytes);
  expect(doc.getSubject()).toBe(g.sequenceHash);
  const mm = 72 / 25.4;
  expect(doc.getPages()[1].getWidth()).toBeCloseTo((g.widthMm + 20) * mm);
  expect(doc.getPageCount()).toBe(
    2 +
      Math.ceil(g.widthMm / 180) * Math.ceil(g.widthMm / 240) +
      Math.ceil(g.moves.length / 40),
  );
  mkdirSync("output/current-qr", { recursive: true });
  writeFileSync("output/current-qr/unit-qr.pdf", bytes);
});
