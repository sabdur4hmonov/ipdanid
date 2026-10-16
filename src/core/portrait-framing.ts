import type { RegionBox, Shape } from "./types";
import type { FaceFill } from "./standard-preparation";
import type { PersonMask } from "./person-mask";
import { referenceTones } from "./reference-preparation";
import { inside } from "./geometry";

export type HeadAdjustment = { zoom: number; x: number; y: number };
export const defaultHeadAdjustment = (): HeadAdjustment => ({
  zoom: 1,
  x: 0,
  y: 0,
});
const smooth = (v: number) => {
  const x = Math.max(0, Math.min(1, v));
  return x * x * (3 - 2 * x);
};
export function chinOpacity(
  y: number,
  chin: number,
  keepShoulders: boolean,
  n = 500,
) {
  return keepShoulders ? 1 : 1 - smooth((y - chin) / (18 / n));
}

// Version3 is a source-pixel composition, not a change to the solver or to old
// preparation2 guides. Coordinates below are in the physical pattern's frame.
export function framePortraitHeads(
  faces: RegionBox[],
  shape: Shape,
  aspect: number,
  keepShoulders = false,
  adjustments: HeadAdjustment[] = faces.map(defaultHeadAdjustment),
): FaceFill {
  // Same source checks as preparation2, without running its obsolete rectangle
  // packing search on every slider movement and guide validation checkpoint.
  if (
    !Array.isArray(faces) ||
    !faces.length ||
    faces.length > (shape === "heart" ? 2 : 3) ||
    !Number.isFinite(aspect) ||
    aspect <= 0 ||
    faces.some(
      (b) =>
        ![b.left, b.top, b.width, b.height].every(Number.isFinite) ||
        b.left < 0 ||
        b.top < 0 ||
        b.width <= 0 ||
        b.height <= 0 ||
        b.left + b.width > 1 ||
        b.top + b.height > 1,
    )
  )
    throw Error("framing/face-count-or-bounds");
  if (
    typeof keepShoulders !== "boolean" ||
    adjustments.length !== faces.length ||
    adjustments.some(
      (a) =>
        ![a.zoom, a.x, a.y].every(Number.isFinite) ||
        a.zoom < 0.65 ||
        a.zoom > 1.5 ||
        Math.abs(a.x) > 0.3 ||
        Math.abs(a.y) > 0.3,
    )
  )
    throw Error("framing/invalid-adjustment");
  const pair = shape === "heart" && faces.length === 2;
  const order = faces
    .map((f, index) => ({ index, cx: f.left + f.width / 2 }))
    .sort((a, b) => a.cx - b.cx);
  const heads = faces.map((f, j) => {
    const left = Math.max(0, f.left - 0.15 * f.width),
      top = Math.max(0, f.top - 0.32 * f.height),
      right = Math.min(1, f.left + 1.15 * f.width),
      chin = Math.min(1, f.top + 1.04 * f.height),
      source = { left, top, width: right - left, height: chin - top },
      ratio = (source.width * aspect) / source.height,
      rank = order.findIndex((o) => o.index === j),
      group = faces.length > 1 && !pair,
      height = pair
        ? Math.min(0.52, 0.42 / ratio)
        : shape === "heart"
          ? Math.min(0.65, 0.76 / ratio)
          : group
            ? Math.min(0.87, 0.9 / faces.length / ratio)
            : Math.min(0.87, 0.88 / ratio),
      width = height * ratio,
      cx = pair
        ? rank === 0
          ? 0.27
          : 0.73
        : group
          ? (rank + 0.5) / faces.length
          : 0.5,
      bottom = pair ? 0.56 : shape === "heart" ? 0.73 : 0.905,
      a = adjustments[j],
      w = width * a.zoom,
      h = height * a.zoom,
      target = {
        left: cx - w / 2 + a.x,
        top: bottom - height + (height - h) / 2 + a.y,
        width: w,
        height: h,
      };
    return { source, target, chin: target.top + target.height };
  });
  return {
    version: "reviewed-head-framing/3",
    sourceBounds: { left: 0, top: 0, width: 1, height: 1 },
    targetBounds: { left: 0, top: 0, width: 1, height: 1 },
    faces: structuredClone(faces),
    targetFaces: faces.map((f, j) => {
      const { source: s, target: t } = heads[j];
      return {
        left: t.left + ((f.left - s.left) / s.width) * t.width,
        top: t.top + ((f.top - s.top) / s.height) * t.height,
        width: (f.width / s.width) * t.width,
        height: (f.height / s.height) * t.height,
      };
    }),
    framing: {
      keepShoulders,
      adjustments: structuredClone(adjustments),
      heads,
      fadePx: 18,
    },
  };
}

// Source and mask are immutable for a selected photo. Sliders only change the
// geometric composition, so avoid redoing CLAHE/unsharp for every pointer move.
const toneCache = new WeakMap<
  HTMLCanvasElement,
  { mask?: PersonMask; full: HTMLCanvasElement }
>();
const shapeMasks = new Map<string, Uint8Array>();
function patternMask(shape: Shape, n: number) {
  const key = `${shape}/${n}`;
  let mask = shapeMasks.get(key);
  if (!mask) {
    mask = Uint8Array.from({ length: n * n }, (_, k) =>
      Number(inside(shape, ((k % n) + 0.5) / n, (Math.floor(k / n) + 0.5) / n)),
    );
    if (shapeMasks.size >= 6)
      shapeMasks.delete(shapeMasks.keys().next().value!);
    shapeMasks.set(key, mask);
  }
  return mask;
}
export function referenceToneCanvas(
  source: HTMLCanvasElement,
  mask: PersonMask | undefined,
) {
  let cached = toneCache.get(source);
  if (!cached || cached.mask !== mask) {
    const tones = referenceTones(
      source.getContext("2d")!.getImageData(0, 0, source.width, source.height)
        .data,
      source.width,
      source.height,
      mask,
    );
    const full = document.createElement("canvas");
    full.width = source.width;
    full.height = source.height;
    const ctx = full.getContext("2d")!,
      image = ctx.createImageData(full.width, full.height);
    for (let k = 0; k < tones.gray.length; k++) {
      image.data[k * 4] =
        image.data[k * 4 + 1] =
        image.data[k * 4 + 2] =
          Math.floor(tones.gray[k] * 255);
      image.data[k * 4 + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    cached = { mask, full };
    toneCache.set(source, cached);
  }
  return cached.full;
}
export function preparePortraitCanvas(
  source: HTMLCanvasElement,
  mask: PersonMask | undefined,
  transform: FaceFill,
  shape: Shape,
  n = 500,
) {
  if (transform.version !== "reviewed-head-framing/3" || !transform.framing)
    throw Error("framing/missing-proof");
  const full = referenceToneCanvas(source, mask);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = n;
  const ctx = canvas.getContext("2d")!,
    output = ctx.createImageData(n, n);
  output.data.fill(255);
  const layer = document.createElement("canvas");
  layer.width = layer.height = n;
  const lc = layer.getContext("2d")!,
    framing = transform.framing,
    pattern = patternMask(shape, n);
  for (const head of framing.heads) {
    const s = head.source,
      t = head.target;
    lc.fillStyle = "#fff";
    lc.fillRect(0, 0, n, n);
    lc.imageSmoothingEnabled = true;
    lc.imageSmoothingQuality = "high";
    lc.drawImage(
      full,
      (t.left - (s.left / s.width) * t.width) * n,
      (t.top - (s.top / s.height) * t.height) * n,
      (t.width / s.width) * n,
      (t.height / s.height) * n,
    );
    const image = lc.getImageData(0, 0, n, n).data;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const u = (x + 0.5) / n,
          v = (y + 0.5) / n;
        if (!pattern[y * n + x]) continue;
        let alpha = chinOpacity(v, head.chin, framing.keepShoulders, 500);
        if (framing.heads.length > 1) {
          // Isolate real people before repositioning; feather source crop edges.
          alpha *=
            smooth((u - t.left) / 0.012) *
            smooth((t.left + t.width - u) / 0.012) *
            smooth((v - t.top + 0.015) / 0.015);
        }
        const k = (y * n + x) * 4,
          value = Math.round(255 - (255 - image[k]) * alpha);
        output.data[k] =
          output.data[k + 1] =
          output.data[k + 2] =
            Math.min(output.data[k], value);
      }
  }
  ctx.putImageData(output, 0, 0);
  return {
    canvas,
    pixels: Uint8Array.from(
      { length: n * n * 3 },
      (_, k) => output.data[Math.floor(k / 3) * 4 + (k % 3)],
    ),
  };
}
