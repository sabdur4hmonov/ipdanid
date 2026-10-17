import type { RegionBox, Shape } from "./types";
import type { FaceFill } from "./standard-preparation";
import { frameCustomerHeads, prepareCustomerCanvas } from "./customer-framing";
import { defaultHeadAdjustment, type HeadAdjustment } from "./portrait-framing";
import { type QuarterTurn } from "./photo-orientation";
import { inside } from "./geometry";
export type ProductKind =
  "people" | "animal" | "vehicle" | "object" | "lettering";
export function frameProduct(
  kind: ProductKind,
  faces: RegionBox[],
  shape: Shape,
  aspect: number,
  keep = false,
  adjustments: HeadAdjustment[] = kind === "people"
    ? faces.map(defaultHeadAdjustment)
    : [defaultHeadAdjustment()],
  rotation: QuarterTurn = 0,
  bounds?: RegionBox,
): FaceFill {
  if (!["people", "animal", "vehicle", "object", "lettering"].includes(kind))
    throw Error("product/kind");
  if (kind === "people") {
    const f = frameCustomerHeads(
      faces,
      shape,
      aspect,
      keep,
      adjustments,
      rotation,
    );
    f.version = "reviewed-product-framing/5";
    f.product = { kind };
    return f;
  }
  if (
    !bounds ||
    faces.length ||
    ![0, 1, 2, 3].includes(rotation) ||
    adjustments.length !== 1
  )
    throw Error("product/bounds");
  const a = adjustments[0];
  if (
    ![a.x, a.y, a.zoom].every(Number.isFinite) ||
    a.zoom < 0.65 ||
    a.zoom > 1.5 ||
    Math.abs(a.x) > 0.3 ||
    Math.abs(a.y) > 0.3
  )
    throw Error("product/adjustment");
  if (
    ![bounds.left, bounds.top, bounds.width, bounds.height, aspect].every(
      Number.isFinite,
    ) ||
    bounds.left < 0 ||
    bounds.top < 0 ||
    bounds.width <= 0 ||
    bounds.height <= 0 ||
    bounds.left + bounds.width > 1.0000000001 ||
    bounds.top + bounds.height > 1.0000000001 ||
    aspect <= 0
  )
    throw Error("product/bounds");
  const pad = 0.06 * Math.max(bounds.width, bounds.height),
    left = Math.max(0, bounds.left - pad),
    top = Math.max(0, bounds.top - pad),
    sourceBounds = {
      left,
      top,
      width: Math.min(1, bounds.left + bounds.width + pad) - left,
      height: Math.min(1, bounds.top + bounds.height + pad) - top,
    };
  const ratio = (sourceBounds.width * aspect) / sourceBounds.height,
    cx = 0.5,
    cy = shape === "heart" ? 0.43 : 0.5;
  let lo = 0,
    hi = Math.min(0.88, 0.88 / ratio);
  for (let k = 0; k < 24; k++) {
    const h = (lo + hi) / 2,
      w = h * ratio;
    let fits = true;
    for (let j = 0; j <= 48; j++) {
      const t = j / 48;
      for (const [x, y] of [
        [cx - w / 2 + t * w, cy - h / 2],
        [cx + w / 2, cy - h / 2 + t * h],
        [cx + w / 2 - t * w, cy + h / 2],
        [cx - w / 2, cy + h / 2 - t * h],
      ])
        if (!inside(shape, x, y)) fits = false;
    }
    if (fits) lo = h;
    else hi = h;
  }
  const old = {
    left: cx - (lo * ratio) / 2,
    top: cy - lo / 2,
    width: lo * ratio,
    height: lo,
  };
  const f: FaceFill = {
    version: "reviewed-product-framing/5",
    faces: [],
    sourceBounds,
    targetBounds: old,
  };
  f.targetBounds = {
    left: old.left + (old.width - old.width * a.zoom) / 2 + a.x,
    top: old.top + (old.height - old.height * a.zoom) / 2 + a.y,
    width: old.width * a.zoom,
    height: old.height * a.zoom,
  };
  f.version = "reviewed-product-framing/5";
  f.faces = [];
  f.targetFaces = [];
  f.product = { kind, bounds: { ...bounds } };
  f.framing = {
    keepShoulders: false,
    adjustments: structuredClone(adjustments),
    heads: [],
    fadePx: 0,
    rotation,
  };
  return f;
}
// Border-connected colour removal only; no invented object/animal landmarks.
// Busy backgrounds remain visible for the customer's review and manual crop.
export function productSource(source: HTMLCanvasElement) {
  const c = document.createElement("canvas");
  c.width = source.width;
  c.height = source.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(source, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height),
    w = c.width,
    h = c.height,
    seen = new Uint8Array(w * h),
    queue = new Int32Array(w * h);
  let end = 0;
  const corners = [0, w - 1, (h - 1) * w, w * h - 1].map((k) => [
    d.data[k * 4],
    d.data[k * 4 + 1],
    d.data[k * 4 + 2],
  ]);
  const background = (k: number) =>
    corners.some(
      (col) => Math.hypot(...col.map((v, j) => v - d.data[k * 4 + j])) < 42,
    ) || d.data[k * 4 + 3] < 20;
  const add = (k: number) => {
    if (!seen[k] && background(k)) {
      seen[k] = 1;
      queue[end++] = k;
    }
  };
  for (let x = 0; x < w; x++) {
    add(x);
    add((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    add(y * w);
    add(y * w + w - 1);
  }
  for (let i = 0; i < end; i++) {
    const k = queue[i],
      x = k % w,
      y = Math.floor(k / w);
    if (x) add(k - 1);
    if (x < w - 1) add(k + 1);
    if (y) add(k - w);
    if (y < h - 1) add(k + w);
  }
  let l = w,
    t = h,
    r = 0,
    b = 0,
    count = 0;
  for (let k = 0; k < w * h; k++) {
    if (seen[k]) {
      d.data[k * 4] = d.data[k * 4 + 1] = d.data[k * 4 + 2] = 255;
    } else if (
      d.data[k * 4 + 3] > 20 &&
      Math.min(d.data[k * 4], d.data[k * 4 + 1], d.data[k * 4 + 2]) < 245
    ) {
      const x = k % w,
        y = Math.floor(k / w);
      l = Math.min(l, x);
      r = Math.max(r, x);
      t = Math.min(t, y);
      b = Math.max(b, y);
      count++;
    }
    d.data[k * 4 + 3] = 255;
  }
  if (count < 16) throw Error("product/empty");
  ctx.putImageData(d, 0, 0);
  return {
    canvas: c,
    bounds: {
      left: l / w,
      top: t / h,
      width: (r - l + 1) / w,
      height: (b - t + 1) / h,
    },
  };
}
export function prepareProductCanvas(
  source: HTMLCanvasElement,
  mask: Parameters<typeof prepareCustomerCanvas>[1],
  f: FaceFill,
  shape: Shape,
  before = false,
  captionPixels?: Uint8Array,
) {
  if (f.version === "reviewed-caption-framing/6") {
    if (!f.caption || (!before && captionPixels?.length !== 500 * 500 * 3))
      throw Error("caption/not-ready");
    const base = frameProduct(
        "people",
        f.faces,
        shape,
        source.width / source.height,
        f.framing?.keepShoulders,
        f.framing?.adjustments,
        f.framing?.rotation,
      ),
      portrait = prepareCustomerCanvas(source, mask, base, shape, before),
      c = document.createElement("canvas");
    c.width = c.height = 500;
    const ctx = c.getContext("2d")!,
      scale = f.caption.portraitScale;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 500, 500);
    ctx.drawImage(
      portrait.canvas,
      (1 - scale) * 250,
      0,
      500 * scale,
      500 * scale,
    );
    const image = ctx.getImageData(0, 0, 500, 500),
      pixels = new Uint8Array(500 * 500 * 3);
    for (let k = 0; k < 500 * 500; k++)
      for (let ch = 0; ch < 3; ch++) {
        const value = inside(
          shape,
          ((k % 500) + 0.5) / 500,
          (Math.floor(k / 500) + 0.5) / 500,
        )
          ? Math.min(
              image.data[k * 4 + ch],
              before ? 255 : captionPixels![k * 3 + ch],
            )
          : 255;
        pixels[k * 3 + ch] = image.data[k * 4 + ch] = value;
      }
    ctx.putImageData(image, 0, 0);
    return { canvas: c, pixels };
  }
  if (f.product?.kind === "people")
    return prepareCustomerCanvas(source, mask, f, shape, before);
  const n = 500,
    c = document.createElement("canvas");
  c.width = c.height = n;
  const ctx = c.getContext("2d")!,
    s = f.sourceBounds,
    t = f.targetBounds;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, n, n);
  ctx.translate(250, 250);
  ctx.rotate(((f.framing?.rotation ?? 0) * Math.PI) / 2);
  ctx.translate(-250, -250);
  ctx.drawImage(
    source,
    (t.left - (s.left / s.width) * t.width) * n,
    (t.top - (s.top / s.height) * t.height) * n,
    (t.width / s.width) * n,
    (t.height / s.height) * n,
  );
  ctx.resetTransform();
  const image = ctx.getImageData(0, 0, n, n);
  for (let k = 0; k < n * n; k++) {
    const x = k % n,
      y = Math.floor(k / n);
    const v = inside(shape, (x + 0.5) / n, (y + 0.5) / n)
      ? Math.round(
          0.299 * image.data[k * 4] +
            0.587 * image.data[k * 4 + 1] +
            0.114 * image.data[k * 4 + 2],
        )
      : 255;
    if (!before)
      image.data[k * 4] = image.data[k * 4 + 1] = image.data[k * 4 + 2] = v;
    else if (!inside(shape, (x + 0.5) / n, (y + 0.5) / n))
      image.data[k * 4] = image.data[k * 4 + 1] = image.data[k * 4 + 2] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return {
    canvas: c,
    pixels: Uint8Array.from(
      { length: n * n * 3 },
      (_, k) => image.data[Math.floor(k / 3) * 4 + (k % 3)],
    ),
  };
}
