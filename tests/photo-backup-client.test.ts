import { describe, it, expect } from "vitest";
import {
  checkedPhotoRead,
  checkedPhotoStatus,
  checkedPendingPhoto,
  photoUpload,
} from "../src/photo-backup-client";
import { DEFAULT_STANDARD_KIT } from "../src/core/standard-kit";
import type { PhotoDraft } from "../src/photo-draft";
import type { PhotoBackupStatus } from "../src/photo-backup-types";
const draft = (): PhotoDraft => ({
  version: "editable-photo/1",
  savedAt: Date.now(),
  width: 2,
  height: 2,
  rgba: new Uint8Array(16).fill(128),
  maskEdited: true,
  analysis: {
    mask: { width: 1, height: 1, values: new Float32Array([0.75]) },
    faces: [],
    faceUnavailable: true,
    cleanupUnavailable: true,
  },
  shape: "heart",
  kind: "people",
  caption: "Ali",
  adjustment: { x: 0.1, y: -0.2, zoom: 1.5 },
  rotation: 1,
  lines: 3000,
  config: structuredClone(DEFAULT_STANDARD_KIT),
});
describe("private photo client contract", () => {
  it("captures exact pixels and placement before await and verifies server checksum", async () => {
    const d = draft(),
      expected = structuredClone(d),
      future = photoUpload(d, 2);
    d.rgba.fill(0);
    d.adjustment.zoom = 2;
    const body = await future,
      bytes = Uint8Array.from(atob(body.archive), (c) => c.charCodeAt(0));
    const checksum = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      (n) => n.toString(16).padStart(2, "0"),
    ).join("");
    const status: PhotoBackupStatus = {
      version: "private-photo-backup/1",
      revision: 3,
      available: true,
      savedAt: Date.now(),
      expiresAt: Date.now() + 60000,
      checksum,
    };
    expect(await checkedPhotoRead({ status, archive: body.archive })).toEqual(
      expected,
    );
    await expect(
      checkedPhotoRead({
        status: { ...status, checksum: "0".repeat(64) },
        archive: body.archive,
      }),
    ).rejects.toThrow();
    await expect(
      checkedPhotoRead({
        status: { ...status, expiresAt: 1 },
        archive: body.archive,
      }),
    ).rejects.toThrow();
  });
  it("bounds pending age and refuses extra credentials or missing consent", async () => {
    const body = await photoUpload(draft(), 0),
      p = { action: "save" as const, createdAt: Date.now(), body };
    expect(await checkedPendingPhoto(p)).toBe(p);
    await expect(checkedPendingPhoto({ ...p, token: "refused" } as typeof p)).rejects.toThrow();
    await expect(
      checkedPendingPhoto(p, p.createdAt + 7 * 86400000),
    ).rejects.toThrow();
    for (const patch of [
      { consent: false },
      { token: "must-not-persist" },
      { archive: body.archive + "==" },
      { expectedRevision: -1 },
    ])
      await expect(
        checkedPendingPhoto({
          ...p,
          body: { ...body, ...patch } as typeof body,
        }),
      ).rejects.toThrow();
    expect(
      await checkedPendingPhoto({
        action: "delete",
        createdAt: Date.now(),
        body: { expectedRevision: 0, requestKey: crypto.randomUUID() },
      }),
    ).toBeTruthy();
  });
  it("rejects contradictory server metadata", () => {
    const s: PhotoBackupStatus = {
      version: "private-photo-backup/1",
      revision: 0,
      available: false,
      savedAt: null,
      expiresAt: null,
      checksum: null,
    };
    expect(checkedPhotoStatus(s)).toBe(s);
    for (const patch of [
      { revision: NaN },
      { available: true },
      { checksum: "unexpected" },
      { version: "unknown" },
    ])
      expect(() =>
        checkedPhotoStatus({ ...s, ...patch } as PhotoBackupStatus),
      ).toThrow();
  });
});
