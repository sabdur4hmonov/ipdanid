import type { FaceFill } from "./standard-preparation";
import type { Shape } from "./types";
import { LETTERING_FONTS, letteringInput } from "./lettering-contract";
import type { LetteringGeometry } from "./lettering";
import { textInput } from "./bidi-runs";

export function withPortraitCaption(
  base: FaceFill,
  shape: Shape,
  input: string,
  shaping: "single/1" | "bidi/2" = "single/1",
): FaceFill {
  if (!input.trim()) return base;
  if (
    ![
      "reviewed-product-framing/5",
      "reviewed-heart-framing/7",
      "reviewed-free-photo/9",
    ].includes(base.version) ||
    base.product?.kind !== "people"
  )
    throw Error("caption/portrait-required");
  const { text, font } =
      shaping === "bidi/2" ? textInput(input) : letteringInput(input),
    scale =
      base.version === "reviewed-free-photo/9"
        ? 1
        : shape === "heart"
          ? 0.88
          : 0.82;
  const notchSafe =
    base.version === "reviewed-heart-framing/7" ||
    (base.version === "reviewed-free-photo/9" && shape === "heart");
  const bounds = notchSafe
    ? { left: 0.42, top: 0.8, width: 0.16, height: 0.04 }
    : shape === "heart"
      ? { left: 0.35, top: 0.65, width: 0.3, height: 0.065 }
      : shape === "circle"
        ? { left: 0.19, top: 0.79, width: 0.62, height: 0.1 }
        : { left: 0.12, top: 0.83, width: 0.76, height: 0.1 };
  return {
    ...base,
    version:
      base.version === "reviewed-free-photo/9"
        ? "reviewed-free-photo/9"
        : base.version === "reviewed-heart-framing/7"
          ? "reviewed-heart-caption-framing/8"
          : "reviewed-caption-framing/6",
    targetFaces: base.targetFaces?.map((b) => ({
      left: (1 - scale) / 2 + b.left * scale,
      top:
        b.top * scale +
        (base.version === "reviewed-heart-framing/7" ? 0.04 : 0),
      width: b.width * scale,
      height: b.height * scale,
    })),
    caption: {
      version:
        shaping === "bidi/2" ? "portrait-caption/2" : "portrait-caption/1",
      text,
      font,
      fontHash: LETTERING_FONTS[font].sha256,
      bounds,
      portraitScale: scale,
    },
  };
}

// Refit actual shaped contours into the reserved caption box. The rasterizer
// fills these same contours; no browser font fallback or preview-only overlay.
export function captionGeometry(
  g: LetteringGeometry,
  box: NonNullable<FaceFill["caption"]>["bounds"],
): LetteringGeometry {
  const b = g.bounds,
    scale = Math.min(box.width / b.width, box.height / b.height),
    width = b.width * scale,
    height = b.height * scale,
    left = box.left + (box.width - width) / 2,
    top = box.top + (box.height - height) / 2;
  const point = (x: number, y: number) => ({
    x: left + (x - b.left) * scale,
    y: top + (y - b.top) * scale,
  });
  return {
    ...g,
    bounds: { left, top, width, height },
    contours: g.contours.map((c) => c.map((p) => point(p.x, p.y))),
    commands: g.commands.map((c) => ({
      ...c,
      args: c.args.map((v, j) =>
        j % 2 ? top + (v - b.top) * scale : left + (v - b.left) * scale,
      ),
    })),
  };
}
