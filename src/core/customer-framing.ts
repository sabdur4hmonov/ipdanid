import type { RegionBox, Shape } from "./types";
import type { FaceFill } from "./standard-preparation";
import type { PersonMask } from "./person-mask";
import {
  framePortraitHeads,
  referenceToneCanvas,
  defaultHeadAdjustment,
  type HeadAdjustment,
} from "./portrait-framing";
import { unturnBox, type QuarterTurn } from "./photo-orientation";
import { inside } from "./geometry";
const smooth = (v: number) => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * (3 - 2 * t);
};
export function turnPoint(x: number, y: number, r: QuarterTurn) {
  return r === 1
    ? { x: 1 - y, y: x }
    : r === 2
      ? { x: 1 - x, y: 1 - y }
      : r === 3
        ? { x: y, y: 1 - x }
        : { x, y };
}
export function frameCustomerHeads(
  faces: RegionBox[],
  shape: Shape,
  aspect: number,
  keepShoulders = false,
  adjustments: HeadAdjustment[] = faces.map(defaultHeadAdjustment),
  rotation: QuarterTurn = 0,
): FaceFill {
  if (![0, 1, 2, 3].includes(rotation)) throw Error("customer/rotation");
  const f = framePortraitHeads(
      faces,
      shape,
      aspect,
      keepShoulders,
      adjustments,
    ),
    pair = shape === "heart" && faces.length === 2;
  f.version = "reviewed-customer-framing/4";
  f.framing!.rotation = rotation;
  f.framing!.heads.forEach((head, j) => {
    const face = faces[j],
      s = head.source,
      old = head.target;
    s.height = Math.min(1, face.top + 0.94 * face.height) - s.top;
    const ratio = (s.width * aspect) / s.height,
      group = faces.length > 1 && !pair;
    const h = pair
      ? Math.min(0.52, 0.42 / ratio)
      : shape === "heart"
        ? Math.min(0.65, 0.76 / ratio)
        : group
          ? Math.min(0.87, 0.9 / faces.length / ratio)
          : Math.min(0.87, 0.88 / ratio);
    const cx = old.left + old.width / 2,
      baseBottom = pair ? 0.56 : shape === "heart" ? 0.73 : 0.905,
      a = adjustments[j];
    head.target = {
      left: cx - (h * ratio * a.zoom) / 2,
      top: baseBottom - h + (h - h * a.zoom) / 2 + a.y,
      width: h * ratio * a.zoom,
      height: h * a.zoom,
    };
    head.chin = head.target.top + head.target.height;
  });
  f.targetFaces = faces.map((face, j) => {
    const { source: s, target: t } = f.framing!.heads[j];
    const b = {
      left: t.left + ((face.left - s.left) / s.width) * t.width,
      top: t.top + ((face.top - s.top) / s.height) * t.height,
      width: (face.width / s.width) * t.width,
      height: (face.height / s.height) * t.height,
    };
    return unturnBox(b, ((4 - rotation) % 4) as QuarterTurn);
  });
  return f;
}
export function customerHeadAlpha(
  u: number,
  v: number,
  face: RegionBox,
  chin: number,
  keep: boolean,
) {
  if (keep) return 1;
  const fade = 1 - smooth((v - (chin - 18 / 500)) / (18 / 500));
  const jawStart = face.top + 0.7 * face.height,
    t = smooth((v - jawStart) / Math.max(0.001, chin - jawStart));
  const half = face.width * (0.6 - 0.23 * t),
    cx = face.left + face.width / 2;
  // Geometric crop of real pixels removes high shirt corners as well as neck.
  const jaw = 1 - smooth((Math.abs(u - cx) - half) / 0.018);
  return fade * (v <= jawStart ? 1 : jaw);
}
const masks = new Map<string, Uint8Array>();
export function prepareCustomerCanvas(
  source: HTMLCanvasElement,
  mask: PersonMask | undefined,
  f: FaceFill,
  shape: Shape,
  before = false,
) {
  if (f.version !== "reviewed-customer-framing/4" || !f.framing)
    throw Error("customer/proof");
  const n = 500,
    full = before ? source : referenceToneCanvas(source, mask),
    composite = document.createElement("canvas");
  composite.width = composite.height = n;
  const ctx = composite.getContext("2d")!,
    out = ctx.createImageData(n, n);
  out.data.fill(255);
  const layer = document.createElement("canvas");
  layer.width = layer.height = n;
  const lc = layer.getContext("2d")!;
  f.framing.heads.forEach((head, j) => {
    const s = head.source,
      t = head.target,
      face = f.faces[j];
    const targetFace = {
      left: t.left + ((face.left - s.left) / s.width) * t.width,
      top: t.top + ((face.top - s.top) / s.height) * t.height,
      width: (face.width / s.width) * t.width,
      height: (face.height / s.height) * t.height,
    };
    lc.fillStyle = "#fff";
    lc.fillRect(0, 0, n, n);
    lc.imageSmoothingQuality = "high";
    lc.drawImage(
      full,
      (t.left - (s.left / s.width) * t.width) * n,
      (t.top - (s.top / s.height) * t.height) * n,
      (t.width / s.width) * n,
      (t.height / s.height) * n,
    );
    const pixels = lc.getImageData(0, 0, n, n).data;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const u = (x + 0.5) / n,
          v = (y + 0.5) / n,
          k = (y * n + x) * 4;
        let alpha = before
          ? 1
          : customerHeadAlpha(
              u,
              v,
              targetFace,
              head.chin,
              f.framing!.keepShoulders,
            );
        if (f.framing!.heads.length > 1)
          alpha *=
            smooth((u - t.left) / 0.012) *
            smooth((t.left + t.width - u) / 0.012) *
            smooth((v - t.top + 0.015) / 0.015);
        for (let c = 0; c < 3; c++)
          out.data[k + c] = Math.min(
            out.data[k + c],
            Math.round(255 - (255 - pixels[k + c]) * alpha),
          );
      }
  });
  ctx.putImageData(out, 0, 0);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = n;
  const c = canvas.getContext("2d")!;
  c.translate(n / 2, n / 2);
  c.rotate(((f.framing.rotation ?? 0) * Math.PI) / 2);
  c.drawImage(composite, -n / 2, -n / 2);
  c.resetTransform();
  const image = c.getImageData(0, 0, n, n);
  let shapeMask = masks.get(shape);
  if (!shapeMask) {
    shapeMask = Uint8Array.from({ length: n * n }, (_, k) =>
      Number(inside(shape, ((k % n) + 0.5) / n, (Math.floor(k / n) + 0.5) / n)),
    );
    masks.set(shape, shapeMask);
  }
  for (let k = 0; k < n * n; k++)
    if (!shapeMask[k])
      image.data[k * 4] = image.data[k * 4 + 1] = image.data[k * 4 + 2] = 255;
  c.putImageData(image, 0, 0);
  return {
    canvas,
    pixels: Uint8Array.from(
      { length: n * n * 3 },
      (_, k) => image.data[Math.floor(k / 3) * 4 + (k % 3)],
    ),
  };
}
