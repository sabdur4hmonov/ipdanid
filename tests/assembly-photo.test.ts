import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  BOARD_PHOTO_TTL,
  BOARD_PHOTO_BYTES,
  boardPhotoCapacity,
  boardPhotoDigest,
  boardPhotoMetadata,
  boardPhotoScopeKey,
  validateBoardPhoto,
  type BoardPhoto,
} from "../src/assembly-photo";
import { imageDimensions } from "../src/core/image";
async function fixture(): Promise<BoardPhoto> {
  const bytes = readFileSync("tests/fixtures/orientation-6.jpg"),
    d = imageDimensions(bytes),
    blob = new Blob([bytes], { type: "image/jpeg" });
  return {
    version: 1,
    id: crypto.randomUUID(),
    projectId: "original-board-fixture",
    sequenceHash: "a".repeat(64),
    step: 7,
    total: 80,
    createdAt: 1800000000000,
    width: d.width,
    height: d.height,
    digest: await boardPhotoDigest(blob),
    blob,
  };
}
test("board photo is bound to one immutable guide/cursor with no session/original-file metadata", async () => {
  const p = await fixture();
  await validateBoardPhoto(p, p.createdAt);
  expect(boardPhotoScopeKey(p)).not.toBe(
    boardPhotoScopeKey({ ...p, sequenceHash: "b".repeat(64) }),
  );
  for (const changes of [
    { step: 0 },
    { step: 81 },
    { total: 20001 },
    { projectId: "" },
    { sequenceHash: "bad" },
    { session: "synthetic-extra-field" },
    { createdAt: p.createdAt + 60001 },
  ])
    expect(() =>
      boardPhotoMetadata({ ...p, ...changes } as BoardPhoto, p.createdAt),
    ).toThrow();
});
test("JPEG integrity, dimensions, type and byte bounds fail before a corrupted photo is shown", async () => {
  const p = await fixture();
  await expect(
    validateBoardPhoto({ ...p, digest: "b".repeat(64) }, p.createdAt),
  ).rejects.toThrow("integrity");
  await expect(
    validateBoardPhoto({ ...p, width: p.width + 1 }, p.createdAt),
  ).rejects.toThrow("integrity");
  for (const blob of [
    new Blob(["<svg/>"], { type: "image/svg+xml" }),
    new Blob([new Uint8Array(BOARD_PHOTO_BYTES + 1)], { type: "image/jpeg" }),
  ])
    expect(() => boardPhotoMetadata({ ...p, blob }, p.createdAt)).toThrow();
});
test("three-per-guide and twenty-per-device limits preserve exact retry and expiry frees capacity", async () => {
  const p = await fixture(),
    rows = Array.from({ length: 3 }, (_, k) => ({
      ...p,
      id: crypto.randomUUID(),
      step: k + 1,
    }));
  expect(() =>
    boardPhotoCapacity(rows, { ...p, id: crypto.randomUUID() }, p.createdAt),
  ).toThrow("capacity");
  expect(() =>
    boardPhotoCapacity(
      rows,
      { ...p, id: crypto.randomUUID(), sequenceHash: "b".repeat(64) },
      p.createdAt,
    ),
  ).toThrow("capacity");
  expect(() => boardPhotoCapacity(rows, rows[0], p.createdAt)).not.toThrow();
  expect(() =>
    boardPhotoCapacity(rows, { ...rows[0], step: 8 }, p.createdAt),
  ).toThrow("immutable");
  const many = Array.from({ length: 20 }, (_, k) => ({
    ...p,
    id: crypto.randomUUID(),
    projectId: "board-" + k,
  }));
  expect(() =>
    boardPhotoCapacity(many, { ...p, id: crypto.randomUUID() }, p.createdAt),
  ).toThrow("capacity");
  expect(() =>
    boardPhotoCapacity(
      many,
      {
        ...p,
        id: crypto.randomUUID(),
        createdAt: p.createdAt + BOARD_PHOTO_TTL,
      },
      p.createdAt + BOARD_PHOTO_TTL,
    ),
  ).not.toThrow();
  await expect(
    validateBoardPhoto(p, p.createdAt + BOARD_PHOTO_TTL),
  ).rejects.toThrow("expired");
});
