import { describe, expect, it } from "vitest";
import {
  encodePhotoDraft,
  decodePhotoDraft,
  DRAFT_TTL,
  type PhotoDraft,
} from "../src/photo-draft";
import { DEFAULT_STANDARD_KIT } from "../src/core/standard-kit";
const now = Date.UTC(2026, 9, 23);
export function sampleDraft(): PhotoDraft {
  return {
    version: "editable-photo/1",
    maskEdited: true,
    savedAt: now,
    width: 2,
    height: 2,
    rgba: Uint8Array.from([
      1, 2, 3, 255, 4, 5, 6, 128, 7, 8, 9, 0, 10, 11, 12, 255,
    ]),
    analysis: {
      mask: { width: 2, height: 1, values: new Float32Array([0.12345678, 1]) },
      faces: [],
      faceUnavailable: true,
      cleanupUnavailable: true,
    },
    shape: "heart",
    kind: "people",
    caption: "Ali علي",
    adjustment: { x: 0.12, y: -0.08, zoom: 1.7 },
    rotation: 1,
    lines: 3000,
    config: structuredClone(DEFAULT_STANDARD_KIT),
  };
}
describe("editable photo archive", () => {
  it("round trips exact pixels, float mask, placement and kit without segmentation", async () => {
    const draft = sampleDraft();
    expect(
      await decodePhotoDraft(await encodePhotoDraft(draft, now), now),
    ).toEqual(draft);
  });
  it("rejects tampered, truncated and appended archives", async () => {
    const bytes = await encodePhotoDraft(sampleDraft(), now);
    const changed = bytes.slice();
    changed[changed.length - 40] ^= 1;
    for (const bad of [
      changed,
      bytes.slice(0, -1),
      new Uint8Array([...bytes, 0]),
    ])
      await expect(decodePhotoDraft(bad, now)).rejects.toThrow();
  });
  it("expires after 30 days and rejects future dates", async () => {
    const bytes = await encodePhotoDraft(sampleDraft(), now);
    await expect(decodePhotoDraft(bytes, now + DRAFT_TTL)).rejects.toThrow();
    await expect(
      encodePhotoDraft({ ...sampleDraft(), savedAt: now + 60001 }, now),
    ).rejects.toThrow();
  });
  it("bounds all allocations and rejects unknown fields instead of accepting credentials", async () => {
    for (const patch of [
      { width: 1537 },
      { lines: 999999 },
      { rotation: 4 },
      { token: "private" },
      { adjustment: { x: 0, y: 0, zoom: 9 } },
      { caption: "x".repeat(513) },
    ])
      await expect(
        encodePhotoDraft({ ...sampleDraft(), ...patch } as PhotoDraft, now),
      ).rejects.toThrow();
  });
  it("rejects invalid masks and face coordinates", async () => {
    const draft = sampleDraft();
    draft.analysis.mask.values[0] = NaN;
    await expect(encodePhotoDraft(draft, now)).rejects.toThrow();
    const other = sampleDraft();
    other.analysis.faces = [
      { face: { left: 0, top: 0, width: 2, height: 1 } } as never,
    ];
    await expect(encodePhotoDraft(other, now)).rejects.toThrow();
  });
});
