import type { RegionBox, Shape } from "./types";
import { frameFreePhoto } from "./free-photo-framing";
import { unturnPoint, type QuarterTurn } from "./photo-orientation";
import type { HeadAdjustment } from "./portrait-framing";

// An explicit user action, never the upload default. It changes only the same
// reversible pan/zoom controls as dragging: no mask, pixels or face reconstruction.
export function suggestPortraitPlacement(
  faces: RegionBox[],
  shape: Shape,
  aspect: number,
  rotation: QuarterTurn,
): HeadAdjustment | undefined {
  if (!faces.length || faces.length > 3) return;
  // Use the existing strict transform checks before calculating an assistance.
  const base = frameFreePhoto(
    "people",
    faces,
    shape,
    aspect,
    undefined,
    rotation,
  );
  const heads = faces.map((b) => ({
    left: Math.max(0, b.left - 0.15 * b.width),
    top: Math.max(0, b.top - 0.5 * b.height),
    right: Math.min(1, b.left + 1.15 * b.width),
    bottom: Math.min(1, b.top + 1.08 * b.height),
  }));
  const left = Math.min(...heads.map((b) => b.left)),
    top = Math.min(...heads.map((b) => b.top)),
    right = Math.max(...heads.map((b) => b.right)),
    bottom = Math.max(...heads.map((b) => b.bottom)),
    w = (right - left) * aspect,
    h = bottom - top,
    turned = rotation % 2 === 1,
    heart = shape === "heart",
    maxWidth = heart ? 0.74 : 0.88,
    maxHeight = heart ? 0.64 : 0.88,
    desired = Math.min(
      maxWidth / (turned ? h : w),
      maxHeight / (turned ? w : h),
    ),
    zoom = Math.max(0.2, Math.min(4, desired / base.targetBounds.height)),
    height = base.targetBounds.height * zoom,
    width = height * aspect,
    centre = unturnPoint(0.5, heart ? 0.4 : 0.49, rotation),
    x = centre.x - ((left + right) / 2 - 0.5) * width - 0.5,
    y = centre.y - ((top + bottom) / 2 - 0.5) * height - (heart ? 0.55 : 0.5);
  if (Math.abs(x) > 1.5 || Math.abs(y) > 1.5) return;
  return { zoom, x, y };
}
