import type { Instruction } from "./types";
import { flatten } from "./engine";
export function renderInstruction(
  ctx: CanvasRenderingContext2D,
  i: Instruction,
  options: { completed?: number; highlight?: number; pins?: boolean } = {},
) {
  const { width: w, height: h } = ctx.canvas,
    p = i.profile;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = p.baseColor;
  ctx.fillRect(0, 0, w, h);
  const pad = w * 0.06,
    padY = h * 0.06,
    sx = w - pad * 2,
    sy = h - padY * 2,
    steps = flatten(i);
  ctx.lineWidth = Math.max(0.25, (p.threadMm / p.widthMm) * sx);
  ctx.lineCap = "round";
  const end = options.completed ?? steps.length;
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
    for (const pin of p.pins) {
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
    const a = p.pins[active.from],
      b = p.pins[active.to];
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
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "white";
      ctx.fillText(String(pin.id), x, y);
    });
  }
}
