import { useEffect, useMemo, useRef, useState } from "react";
import { solidPartMesh, type SolidPlan } from "./core/solid-plan";
import { cross3, type Point3 } from "./core/solid-geometry";
import { solidText } from "./solid-i18n";
import type { Locale } from "./core/types";
export function SolidPreview({
  plan,
  step,
  locale,
}: {
  plan: SolidPlan;
  step: number;
  locale: Locale;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    drag = useRef<{ x: number; y: number; angle: number; tilt: number }>(
      undefined,
    ),
    [angle, setAngle] = useState(335),
    [tilt, setTilt] = useState(55),
    [partOnly, setPartOnly] = useState(false);
  const t = (key: Parameters<typeof solidText>[1]) => solidText(locale, key);
  const faces = useMemo(
    () =>
      plan.parts.flatMap((_, i) =>
        partOnly && i + 1 !== step
          ? []
          : solidPartMesh(plan, i + 1, !partOnly).map((triangle) => ({
              triangle,
              part: i + 1,
            })),
      ),
    [plan.sequenceHash, partOnly, step],
  );
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx || !faces.length) return;
    const min: Point3 = [Infinity, Infinity, Infinity],
      max: Point3 = [-Infinity, -Infinity, -Infinity];
    for (const f of faces)
      for (const p of f.triangle)
        for (let c = 0; c < 3; c++) {
          min[c] = Math.min(min[c], p[c]);
          max[c] = Math.max(max[c], p[c]);
        }
    const centre = min.map((v, c) => (v + max[c]) / 2),
      a = (angle * Math.PI) / 180,
      b = (tilt * Math.PI) / 180,
      rotate = (p: Point3) => {
        const x = p[0] * Math.cos(a) - p[1] * Math.sin(a),
          y = p[0] * Math.sin(a) + p[1] * Math.cos(a);
        return [
          x,
          y * Math.cos(b) + p[2] * Math.sin(b),
          -y * Math.sin(b) + p[2] * Math.cos(b),
        ] as Point3;
      };
    const projected = faces.map((f) => {
      const points = f.triangle.map((p) =>
        rotate(p.map((v, c) => v - centre[c]) as Point3),
      );
      return { ...f, points, depth: points.reduce((s, p) => s + p[2], 0) / 3 };
    });
    const low = [Infinity, Infinity],
      high = [-Infinity, -Infinity];
    for (const f of projected)
      for (const p of f.points)
        for (let c = 0; c < 2; c++) {
          low[c] = Math.min(low[c], p[c]);
          high[c] = Math.max(high[c], p[c]);
        }
    const scale =
        0.88 *
        Math.min(600 / (high[0] - low[0] || 1), 420 / (high[1] - low[1] || 1)),
      cx = (low[0] + high[0]) / 2,
      cy = (low[1] + high[1]) / 2;
    ctx.fillStyle = "#f4f7f3";
    ctx.fillRect(0, 0, 600, 420);
    for (const f of projected.sort((a, b) => a.depth - b.depth)) {
      const u = f.points[1].map((v, c) => v - f.points[0][c]) as Point3,
        v = f.points[2].map((v, c) => v - f.points[0][c]) as Point3,
        n = cross3(u, v),
        length = Math.hypot(...n),
        light =
          0.55 +
          0.45 *
            Math.abs(
              (n[0] * 0.2 - n[1] * 0.4 + n[2]) / (length * Math.sqrt(1.2)),
            ),
        base = f.part === step ? [39, 98, 73] : [185, 208, 192];
      ctx.fillStyle = `rgb(${base.map((c) => Math.round(c * light)).join(",")})`;
      ctx.strokeStyle = "rgba(35,61,46,.12)";
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      f.points.forEach((p, i) => {
        const x = 300 + (p[0] - cx) * scale,
          y = 210 - (p[1] - cy) * scale;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }, [faces, angle, tilt, step]);
  const clean = () => {
    drag.current = undefined;
  };
  return (
    <div data-testid="solid-view">
      <canvas
        ref={canvas}
        width={600}
        height={420}
        role="img"
        aria-label={t("title")}
        data-solid-hash={plan.sequenceHash}
        data-yaw={angle}
        data-tilt={tilt}
        style={{ width: "100%", height: "auto", touchAction: "none" }}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY, angle, tilt };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const p = drag.current;
          if (p) {
            setAngle(Math.round((p.angle + e.clientX - p.x + 720) % 360));
            setTilt(
              Math.round(Math.max(10, Math.min(85, p.tilt + e.clientY - p.y))),
            );
          }
        }}
        onPointerUp={clean}
        onPointerCancel={clean}
      />
      <div className="grid-fields">
        <label>
          {t("rotate")}
          <input
            aria-label={t("rotate")}
            type="range"
            min={0}
            max={360}
            value={angle}
            onChange={(e) => setAngle(Number(e.target.value))}
          />
        </label>
        <label>
          {t("tilt")}
          <input
            aria-label={t("tilt")}
            type="range"
            min={10}
            max={85}
            value={tilt}
            onChange={(e) => setTilt(Number(e.target.value))}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={partOnly}
            onChange={(e) => setPartOnly(e.target.checked)}
          />
          {t("partOnly")}
        </label>
        <button
          onClick={() => {
            setAngle(335);
            setTilt(55);
          }}
        >
          {t("reset")}
        </button>
      </div>
    </div>
  );
}
