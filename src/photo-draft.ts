import type { Shape } from "./core/types";
import type { ProductKind } from "./core/product-framing";
import type { HeadAdjustment } from "./core/portrait-framing";
import type { QuarterTurn } from "./core/photo-orientation";
import type { PhotoAnalysis } from "./photo-prepare";
import { validatePersonMask } from "./core/person-mask";
import {
  validateStandardConfig,
  type StandardKitConfig,
} from "./core/standard-kit";
import { frameFreePhoto } from "./core/free-photo-framing";

// The lossless, normalized working copy (no EXIF), not the camera original.
// No guide, receipt, session, token or permission to publish belongs here.
export type PhotoDraft = {
  version: "editable-photo/1";
  savedAt: number;
  width: number;
  height: number;
  rgba: Uint8Array;
  maskEdited: boolean;
  analysis: PhotoAnalysis;
  shape: Shape;
  kind: ProductKind;
  caption: string;
  adjustment: HeadAdjustment;
  rotation: QuarterTurn;
  lines: number;
  config: StandardKitConfig;
};
export const DRAFT_TTL = 30 * 86400000;
export const MAX_DRAFT_BYTES = 14 * 1024 * 1024;
const MAGIC = new TextEncoder().encode("IPPHOTO1");
const fail = () => {
  throw Error("photo-draft/invalid-or-expired");
};
function keys(value: object, required: string[], optional: string[] = []) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    required.some((k) => !Object.hasOwn(value, k)) ||
    Object.keys(value).some(
      (k) => !required.includes(k) && !optional.includes(k),
    )
  )
    fail();
}
function dimensions(w: number, h: number, max: number) {
  if (
    !Number.isInteger(w) ||
    !Number.isInteger(h) ||
    w < 1 ||
    h < 1 ||
    w > max ||
    h > max
  )
    fail();
}
function validate(d: PhotoDraft, now: number) {
  keys(d, [
    "version",
    "savedAt",
    "width",
    "height",
    "rgba",
    "maskEdited",
    "analysis",
    "shape",
    "kind",
    "caption",
    "adjustment",
    "rotation",
    "lines",
    "config",
  ]);
  if (
    d.version !== "editable-photo/1" ||
    !Number.isSafeInteger(d.savedAt) ||
    d.savedAt < 0 ||
    d.savedAt > now + 60000 ||
    now - d.savedAt >= DRAFT_TTL ||
    typeof d.maskEdited !== "boolean" ||
    typeof d.caption !== "string" ||
    d.caption.length > 512 ||
    ![2500, 3000, 3500].includes(d.lines)
  )
    fail();
  dimensions(d.width, d.height, 1536);
  if (
    !(d.rgba instanceof Uint8Array) ||
    d.rgba.length !== d.width * d.height * 4
  )
    fail();
  keys(
    d.analysis,
    ["mask", "faces", "faceUnavailable", "cleanupUnavailable"],
    ["analysisTurn"],
  );
  const a = d.analysis;
  if (
    typeof a.faceUnavailable !== "boolean" ||
    typeof a.cleanupUnavailable !== "boolean" ||
    (a.analysisTurn !== undefined && ![0, 1, 2, 3].includes(a.analysisTurn)) ||
    !Array.isArray(a.faces) ||
    a.faces.length > 20
  )
    fail();
  keys(a.mask, ["width", "height", "values"]);
  if (!(a.mask.values instanceof Float32Array)) fail();
  validatePersonMask(a.mask);
  for (const face of a.faces) {
    keys(face, ["face", "eyes", "nose", "mouth"]);
    for (const box of Object.values(face)) {
      keys(box, ["left", "top", "width", "height"]);
      if (
        ![box.left, box.top, box.width, box.height].every(Number.isFinite) ||
        box.left < 0 ||
        box.top < 0 ||
        box.width <= 0 ||
        box.height <= 0 ||
        box.left + box.width > 1.000001 ||
        box.top + box.height > 1.000001
      )
        fail();
    }
  }
  keys(d.adjustment, ["x", "y", "zoom"]);
  frameFreePhoto(
    d.kind,
    a.faces.map((f) => f.face),
    d.shape,
    d.width / d.height,
    d.adjustment,
    d.rotation,
  );
  validateStandardConfig(d.config);
}
async function digest(bytes: Uint8Array) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
  );
}
export async function encodePhotoDraft(value: PhotoDraft, now = Date.now()) {
  // Freeze before await: changing an editor while hashing must not mix revisions.
  const d = structuredClone(value);
  validate(d, now);
  const { rgba, analysis, ...fields } = d;
  const metadata = new TextEncoder().encode(
    JSON.stringify({
      ...fields,
      analysis: {
        ...analysis,
        mask: { width: analysis.mask.width, height: analysis.mask.height },
      },
    }),
  );
  if (metadata.length > 32768) fail();
  const bytes = new Uint8Array(
    12 + metadata.length + rgba.length + analysis.mask.values.length * 4 + 32,
  );
  if (bytes.length > MAX_DRAFT_BYTES) fail();
  bytes.set(MAGIC);
  new DataView(bytes.buffer).setUint32(8, metadata.length, true);
  bytes.set(metadata, 12);
  bytes.set(rgba, 12 + metadata.length);
  const view = new DataView(bytes.buffer);
  let offset = 12 + metadata.length + rgba.length;
  for (const v of analysis.mask.values) {
    view.setFloat32(offset, v, true);
    offset += 4;
  }
  bytes.set(await digest(bytes.subarray(0, offset)), offset);
  return bytes;
}
export async function decodePhotoDraft(
  input: Uint8Array,
  now = Date.now(),
): Promise<PhotoDraft> {
  if (
    !(input instanceof Uint8Array) ||
    input.length < 44 ||
    input.length > MAX_DRAFT_BYTES
  )
    fail();
  const bytes = input.slice();
  if (MAGIC.some((v, i) => bytes[i] !== v)) fail();
  const view = new DataView(bytes.buffer),
    length = view.getUint32(8, true);
  if (length < 2 || length > 32768 || length + 44 > bytes.length) fail();
  const expected = await digest(bytes.subarray(0, -32));
  if (expected.some((v, i) => v !== bytes[bytes.length - 32 + i])) fail();
  const metadata = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(
      bytes.subarray(12, 12 + length),
    ),
  );
  dimensions(metadata.width, metadata.height, 1536);
  const mask = metadata.analysis?.mask;
  if (!mask) fail();
  dimensions(mask.width, mask.height, 1024);
  keys(mask, ["width", "height"]);
  if (Object.hasOwn(metadata, "rgba")) fail();
  const pixels = metadata.width * metadata.height * 4,
    count = mask.width * mask.height;
  if (12 + length + pixels + count * 4 + 32 !== bytes.length) fail();
  const rgba = bytes.slice(12 + length, 12 + length + pixels),
    values = new Float32Array(count);
  for (let k = 0; k < count; k++)
    values[k] = view.getFloat32(12 + length + pixels + k * 4, true);
  const result = {
    ...metadata,
    rgba,
    analysis: { ...metadata.analysis, mask: { ...mask, values } },
  } as PhotoDraft;
  validate(result, now);
  return result;
}
