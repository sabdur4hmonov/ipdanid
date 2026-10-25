import { imageDimensions } from "./core/image";
export const BOARD_PHOTO_TTL = 30 * 86400000,
  BOARD_PHOTO_BYTES = 524288;
export type BoardPhotoScope = {
  projectId: string;
  sequenceHash: string;
  step: number;
  total: number;
};
export type BoardPhoto = BoardPhotoScope & {
  version: 1;
  id: string;
  createdAt: number;
  width: number;
  height: number;
  digest: string;
  blob: Blob;
};
export function boardPhotoScopeKey(s: BoardPhotoScope) {
  if (
    !s ||
    typeof s.projectId !== "string" ||
    !s.projectId.trim() ||
    s.projectId.length > 200 ||
    !/^[a-f0-9]{64}$/.test(s.sequenceHash) ||
    !Number.isSafeInteger(s.total) ||
    s.total < 1 ||
    s.total > 20000 ||
    !Number.isSafeInteger(s.step) ||
    s.step < 1 ||
    s.step > s.total
  )
    throw Error("board-photo/scope");
  return JSON.stringify([s.projectId, s.sequenceHash, s.step, s.total]);
}
export function boardPhotoMetadata(p: BoardPhoto, now = Date.now()) {
  boardPhotoScopeKey(p);
  const keys = [
    "projectId",
    "sequenceHash",
    "step",
    "total",
    "version",
    "id",
    "createdAt",
    "width",
    "height",
    "digest",
    "blob",
  ];
  if (
    Object.keys(p).length !== keys.length ||
    keys.some((k) => !Object.hasOwn(p, k)) ||
    p.version !== 1 ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      p.id,
    ) ||
    !Number.isSafeInteger(p.createdAt) ||
    p.createdAt < 0 ||
    p.createdAt > now + 60000 ||
    !(p.blob instanceof Blob) ||
    p.blob.type !== "image/jpeg" ||
    p.blob.size < 4 ||
    p.blob.size > BOARD_PHOTO_BYTES ||
    !/^[a-f0-9]{64}$/.test(p.digest) ||
    ![p.width, p.height].every((n) => Number.isInteger(n) && n >= 1 && n <= 960)
  )
    throw Error("board-photo/invalid");
}
export async function boardPhotoDigest(blob: Blob) {
  const bytes = await blob.arrayBuffer();
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (v) => v.toString(16).padStart(2, "0"),
  ).join("");
}
export async function validateBoardPhoto(p: BoardPhoto, now = Date.now()) {
  boardPhotoMetadata(p, now);
  if (now - p.createdAt >= BOARD_PHOTO_TTL) throw Error("board-photo/expired");
  const bytes = new Uint8Array(await p.blob.arrayBuffer()),
    d = imageDimensions(bytes);
  if (
    d.type !== "image/jpeg" ||
    d.width !== p.width ||
    d.height !== p.height ||
    (await boardPhotoDigest(p.blob)) !== p.digest
  )
    throw Error("board-photo/integrity");
}
export function boardPhotoCapacity(
  rows: BoardPhoto[],
  next: BoardPhoto,
  now = Date.now(),
) {
  boardPhotoMetadata(next, now);
  const active = rows.filter((p) => now - p.createdAt < BOARD_PHOTO_TTL),
    old = active.find((p) => p.id === next.id);
  if (old) {
    if (
      boardPhotoScopeKey(old) !== boardPhotoScopeKey(next) ||
      old.digest !== next.digest ||
      old.createdAt !== next.createdAt
    )
      throw Error("board-photo/immutable");
    return;
  }
  if (
    active.length >= 20 ||
    active.filter((p) => p.projectId === next.projectId).length >= 3
  )
    throw Error("board-photo/capacity");
}
