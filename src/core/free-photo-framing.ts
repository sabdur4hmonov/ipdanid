import type { RegionBox, Shape } from "./types";
import type { FaceFill } from "./standard-preparation";
import type { ProductKind } from "./product-framing";
import { defaultHeadAdjustment, type HeadAdjustment } from "./portrait-framing";
import { unturnBox, unturnPoint, type QuarterTurn } from "./photo-orientation";
import { inside } from "./geometry";

// Whole-photo transform. Face detections affect solver importance only: never
// the crop, shoulder visibility, relative positions or scale of the subjects.
export function frameFreePhoto(
  kind: ProductKind,
  faces: RegionBox[],
  shape: Shape,
  aspect: number,
  adjustment: HeadAdjustment = defaultHeadAdjustment(),
  rotation: QuarterTurn = 0,
): FaceFill {
  const a = adjustment;
  if (
    !["people", "animal", "vehicle", "object", "lettering"].includes(kind) ||
    !["circle", "rectangle", "heart"].includes(shape) ||
    ![0, 1, 2, 3].includes(rotation) ||
    ![aspect, a.x, a.y, a.zoom].every(Number.isFinite) ||
    aspect <= 0 ||
    aspect > 100 ||
    a.zoom < 0.2 ||
    a.zoom > 4 ||
    Math.abs(a.x) > 1.5 ||
    Math.abs(a.y) > 1.5 ||
    faces.length > 20 ||
    faces.some(
      (b) =>
        ![b.left, b.top, b.width, b.height].every(Number.isFinite) ||
        b.left < 0 ||
        b.top < 0 ||
        b.width <= 0 ||
        b.height <= 0 ||
        b.left + b.width > 1.000001 ||
        b.top + b.height > 1.000001,
    )
  )
    throw Error("free-photo/transform");
  // Fit the complete source rectangle inside the outline on first open.
  // This is geometric containment, never a detected-head crop.
  const cy = shape === "heart" ? 0.55 : 0.5;
  let lo = 0,
    hi = Math.min(0.94, 0.94 / aspect);
  for (let j = 0; j < 24; j++) {
    const h = (lo + hi) / 2,
      w = h * aspect;
    let fits = true;
    for (let k = 0; k <= 48; k++)
      for (const [x, y] of [
        [0.5 - w / 2 + (k / 48) * w, cy - h / 2],
        [0.5 - w / 2 + (k / 48) * w, cy + h / 2],
        [0.5 - w / 2, cy - h / 2 + (k / 48) * h],
        [0.5 + w / 2, cy - h / 2 + (k / 48) * h],
      ])
        if (!inside(shape, x, y)) fits = false;
    if (fits) lo = h;
    else hi = h;
  }
  const width = lo * aspect * a.zoom,
    height = lo * a.zoom;
  const t = {
    left: 0.5 - width / 2 + a.x,
    top: cy - height / 2 + a.y,
    width,
    height,
  };
  const targetFaces = faces
    .map((b) =>
      unturnBox(
        {
          left: t.left + b.left * width,
          top: t.top + b.top * height,
          width: b.width * width,
          height: b.height * height,
        },
        ((4 - rotation) % 4) as QuarterTurn,
      ),
    )
    .map((b) => {
      const left = Math.max(0, b.left),
        top = Math.max(0, b.top);
      return {
        left,
        top,
        width: Math.max(0, Math.min(1, b.left + b.width) - left),
        height: Math.max(0, Math.min(1, b.top + b.height) - top),
      };
    })
    .filter((b) => b.width > 0.005 && b.height > 0.005);
  return {
    version: "reviewed-free-photo/9",
    faces: structuredClone(faces),
    sourceBounds: { left: 0, top: 0, width: 1, height: 1 },
    targetBounds: t,
    targetFaces,
    product: { kind },
    framing: {
      keepShoulders: true,
      adjustments: [{ ...a }],
      heads: [],
      fadePx: 0,
      rotation,
    },
  };
}

export function freePhotoSourcePoint(f: FaceFill, x: number, y: number) {
  const p = unturnPoint(x, y, f.framing?.rotation ?? 0),
    t = f.targetBounds;
  return { x: (p.x - t.left) / t.width, y: (p.y - t.top) / t.height };
}

// Source is either the original, colour cutout or prepared tonal cutout.
// All three use exactly the same global transform and physical shape mask.
export function freePhotoCanvas(
  source: HTMLCanvasElement,
  f: FaceFill,
  shape: Shape,
  captionPixels?: Uint8Array,
) {
  const n = 500,
    c = document.createElement("canvas");
  c.width = c.height = n;
  const ctx = c.getContext("2d")!,
    t = f.targetBounds;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, n, n);
  ctx.translate(n / 2, n / 2);
  ctx.rotate(((f.framing?.rotation ?? 0) * Math.PI) / 2);
  ctx.translate(-n / 2, -n / 2);
  ctx.drawImage(source, t.left * n, t.top * n, t.width * n, t.height * n);
  ctx.resetTransform();
  const d = ctx.getImageData(0, 0, n, n),
    pixels = new Uint8Array(n * n * 3);
  for (let k = 0; k < n * n; k++)
    for (let ch = 0; ch < 3; ch++) {
      const v = inside(
        shape,
        ((k % n) + 0.5) / n,
        (Math.floor(k / n) + 0.5) / n,
      )
        ? Math.min(d.data[k * 4 + ch], captionPixels?.[k * 3 + ch] ?? 255)
        : 255;
      pixels[k * 3 + ch] = d.data[k * 4 + ch] = v;
    }
  ctx.putImageData(d, 0, 0);
  return { canvas: c, pixels };
}
