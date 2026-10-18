import { usesOpticalRaster } from "./render-model";
import type { Instruction } from "./types";
import { flatten } from "./engine";
import { rasterSequence } from "./optical";
import { referenceRaster, classicPins } from "./classic-reference";
export function renderInstruction(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  i: Instruction,
  options: {
    completed?: number;
    highlight?: number;
    pins?: boolean;
    surface?: () => HTMLCanvasElement | OffscreenCanvas;
  } = {},
) {
  const { width: w, height: h } = ctx.canvas,
    p = i.profile;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = p.baseColor;
  ctx.fillRect(0, 0, w, h);
  const reference = [
      "classic-greedy/2",
      "classic-greedy/3",
      "standard-accent/21",
    ].includes(i.algorithm),
    viewPins = reference
      ? classicPins(p, i.params.resolution).map((a) => ({
          ...a,
          x: a.x / i.params.resolution,
          y: a.y / i.params.resolution,
        }))
      : p.pins;
  const pad = reference ? 0 : w * 0.06,
    padY = reference ? 0 : h * 0.06,
    sx = w - pad * 2,
    sy = h - padY * 2,
    steps = flatten(i);
  ctx.lineWidth = (p.threadMm / p.widthMm) * sx;
  ctx.lineCap = "round";
  const end = options.completed ?? steps.length;
  if (usesOpticalRaster(i.algorithm)) {
    const n = reference ? 1000 : i.params.resolution,
      raster = reference ? referenceRaster(i, n, end) : rasterSequence(i, end);
    const surface = options.surface?.() ?? document.createElement("canvas");
    surface.width = surface.height = n;
    const source = surface.getContext("2d")! as
      CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    const pixels = source.createImageData(n, n);
    for (let k = 0; k < n * n; k++) {
      for (let c = 0; c < 3; c++)
        pixels.data[k * 4 + c] = Math.round(raster[k * 3 + c] * 255);
      pixels.data[k * 4 + 3] = 255;
    }
    source.putImageData(pixels, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(surface, pad, padY, sx, sy);
  } else
    for (const s of steps.slice(0, end)) {
      const a = p.pins[s.from],
        b = p.pins[s.to];
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = p.opacity;
      ctx.beginPath();
      ctx.moveTo(pad + a.x * sx, padY + a.y * sy);
      ctx.lineTo(pad + b.x * sx, padY + b.y * sy);
      ctx.stroke();
    }
  ctx.globalAlpha = 1;
  if (options.pins)
    for (const pin of viewPins) {
      ctx.fillStyle = "#9a9b90";
      ctx.beginPath();
      ctx.arc(
        pad + pin.x * sx,
        padY + pin.y * sy,
        Math.max(1.2, ((p.shaftMm / p.widthMm) * sx) / 2),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  const active = steps[(options.highlight ?? 0) - 1];
  if (active) {
    const a = viewPins[active.from],
      b = viewPins[active.to];
    ctx.strokeStyle = "#e47b48";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pad + a.x * sx, padY + a.y * sy);
    ctx.lineTo(pad + b.x * sx, padY + b.y * sy);
    ctx.stroke();
    [a, b].forEach((pin, j) => {
      const x = pad + pin.x * sx,
        y = padY + pin.y * sy;
      ctx.fillStyle = j ? "#173f35" : "#e47b48";
      ctx.beginPath();
      ctx.arc(x, y, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = p.standardKit
        ? "bold 17px sans-serif"
        : "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "white";
      const original = p.pins[j ? active.to : active.from];
      ctx.fillText(original.sectorLabel ?? String(original.id), x, y);
    });
  }
}
