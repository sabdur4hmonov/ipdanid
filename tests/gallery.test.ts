import { afterEach, expect, it } from "vitest";
import { randomUUID, randomBytes } from "node:crypto";
import { deflateSync } from "node:zlib";
import UPNGModule from "@pdf-lib/upng";
import { KitStore } from "../server/kit-store";
import { GalleryStore } from "../server/gallery-store";
import {
  galleryPng,
  decodeGalleryPng,
  normalizeGalleryImage,
  pngCrc,
} from "../server/gallery-image";
import { GALLERY_CONSENT } from "../src/gallery-types";
const UPNG: any = (UPNGModule as any).default ?? UPNGModule,
  stores: KitStore[] = [];
const DAY = 86400000;
afterEach(() => stores.splice(0).forEach((s) => s.close()));
function setup() {
  const store = new KitStore(":memory:", "p".repeat(32), "k".repeat(32));
  stores.push(store);
  let now = 1_800_000_000_000;
  const g = new GalleryStore(store, () => now),
    guest = store.createGuest(),
    owner = store.createGuest(),
    other = store.createGuest();
  store.db
    .prepare("UPDATE users SET role='maker' WHERE id IN (?,?)")
    .run(owner.id, other.id);
  return {
    store,
    g,
    owner,
    other,
    guest,
    advance: (n: number) => (now += n),
    now: () => now,
  };
}
function payload() {
  return {
    title: "Paper artwork",
    alias: "Maker",
    review: "Clear steps",
    rating: 5,
    image: galleryPng(new Uint8Array(96 * 96 * 3).fill(130), 96, 96).toString(
      "base64",
    ),
    requestKey: randomUUID(),
    consentVersion: GALLERY_CONSENT,
    consent: true,
    finished: true,
    rights: true,
    publish: true,
  };
}
function pngChunk(type: string, data: Buffer) {
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length);
  out.write(type, 4);
  data.copy(out, 8);
  out.writeUInt32BE(pngCrc(out.subarray(4, -4)), out.length - 4);
  return out;
}
it("requires a real maker, separate explicit consent/rights/finished/public assertions and bounded plain text", () => {
  const { g, owner, guest, store } = setup(),
    body = payload();
  expect(() => g.submit(guest.id, body)).toThrow("account");
  for (const key of ["consent", "finished", "rights", "publish"])
    for (const value of [false, undefined, "true", 1])
      expect(() => g.submit(owner.id, { ...body, [key]: value })).toThrow(
        "consent",
      );
  for (const p of [
    { consentVersion: "future" },
    { title: "" },
    { title: "x".repeat(81) },
    { alias: "a\u202eb" },
    { review: "x".repeat(801) },
    { rating: 6 },
    { rating: 1.5 },
    { rating: 0 },
    { review: "", rating: 5 },
    { extra: true },
  ])
    expect(() => g.submit(owner.id, { ...body, ...p })).toThrow();
  expect(
    store.db.prepare("SELECT COUNT(*) n FROM gallery_posts").get()?.n,
  ).toBe(0);
});
it("keeps pending and rejected content private, publishes only approved fields and has revision-fenced moderation", () => {
  const { g, owner, now, advance } = setup(),
    body = payload(),
    post = g.submit(owner.id, body);
  expect(post.state).toBe("pending");
  expect(g.page().items).toHaveLength(0);
  expect(() => g.publicImage(post.id)).toThrow("not-found");
  expect(g.ownImage(owner.id, post.id).image).toBeTruthy();
  expect(g.submit(owner.id, body).id).toBe(post.id);
  expect(() => g.submit(owner.id, { ...body, title: "Changed" })).toThrow(
    "conflict",
  );
  expect(g.moderation().items[0].id).toBe(post.id);
  const approved = g.moderate("admin", post.id, {
    state: "approved",
    revision: post.revision,
    reason: null,
  });
  expect(approved.expiresAt).toBe(now() + 365 * DAY);
  expect(g.page()).toMatchObject({ total: 1, averageRating: 5 });
  expect(g.publicImage(post.id).image).toBe(g.moderatorImage(post.id).image);
  const publicItem = g.page().items[0];
  expect(Object.keys(publicItem).sort()).toEqual(
    [
      "alias",
      "expiresAt",
      "id",
      "publishedAt",
      "rating",
      "review",
      "thumbnail",
      "title",
    ].sort(),
  );
  expect(JSON.stringify(publicItem)).not.toMatch(
    /user_id|requestKey|fingerprint|reason|consent|token|email/,
  );
  expect(() =>
    g.moderate("admin", post.id, {
      state: "rejected",
      reason: "privacy",
      revision: post.revision,
    }),
  ).toThrow("conflict");
  const rejected = g.moderate("admin", post.id, {
    state: "rejected",
    reason: "privacy",
    revision: approved.revision,
  });
  expect(g.page().items).toHaveLength(0);
  expect(g.mine(owner.id).items[0].reason).toBe("privacy");
  expect(() => g.publicImage(post.id)).toThrow("not-found");
  advance(DAY);
  const renewed = g.moderate("admin", post.id, {
    state: "approved",
    revision: rejected.revision,
    reason: null,
  });
  expect(renewed.expiresAt).toBe(approved.expiresAt);
  for (const bad of [
    { state: "deleted", revision: renewed.revision, reason: null },
    { state: "approved", revision: renewed.revision, reason: "privacy" },
    { state: "rejected", revision: renewed.revision, reason: "unsafe text" },
  ])
    expect(() => g.moderate("admin", post.id, bad)).toThrow("moderation");
});
it("withdrawal is owner-only, scrubs live media/review immediately and request retries never resurrect it", () => {
  const { g, store, owner, other } = setup(),
    body = payload(),
    post = g.submit(owner.id, body),
    approved = g.moderate("admin", post.id, {
      state: "approved",
      revision: 1,
      reason: null,
    });
  expect(() => g.withdraw(other.id, post.id, approved.revision)).toThrow(
    "not-found",
  );
  expect(() => g.ownImage(other.id, post.id)).toThrow("not-found");
  expect(() => g.withdraw(owner.id, post.id, 1)).toThrow("conflict");
  expect(g.withdraw(owner.id, post.id, approved.revision)).toEqual({
    deleted: true,
  });
  expect(g.withdraw(owner.id, post.id, approved.revision)).toEqual({
    deleted: true,
  });
  expect(g.page().total).toBe(0);
  expect(g.mine(owner.id).items).toHaveLength(0);
  expect(() => g.publicImage(post.id)).toThrow("not-found");
  expect(() => g.moderatorImage(post.id)).toThrow("not-found");
  const raw = store.db
    .prepare("SELECT * FROM gallery_posts WHERE id=?")
    .get(post.id)!;
  expect(raw).toMatchObject({
    title: "",
    alias: "",
    review: "",
    rating: 0,
    image: null,
    thumbnail: null,
    fingerprint: "",
    state: "deleted",
  });
  expect(g.submit(owner.id, body).state).toBe("deleted");
  expect(() =>
    g.moderate("admin", post.id, {
      state: "approved",
      revision: 3,
      reason: null,
    }),
  ).toThrow("not-found");
  const logs = JSON.stringify(store.auditHistory());
  expect(logs).not.toContain(body.alias);
  expect(logs).not.toContain(body.review);
  expect(logs).not.toContain(body.image);
  expect(
    store.auditHistory().filter((a) => a.action === "gallery.withdraw"),
  ).toHaveLength(1);
});
it("pending30day and first-approved365day retention scrub media; account erasure removes every owned gallery record", () => {
  const { g, store, owner, other, advance } = setup(),
    pending = g.submit(owner.id, payload()),
    published = g.submit(other.id, payload());
  g.moderate("admin", published.id, {
    state: "approved",
    revision: 1,
    reason: null,
  });
  advance(30 * DAY);
  expect(g.prune().scrubbed).toBe(1);
  expect(g.mine(owner.id).items).toHaveLength(0);
  expect(g.page().total).toBe(1);
  expect(
    store.db
      .prepare("SELECT image FROM gallery_posts WHERE id=?")
      .get(pending.id)?.image,
  ).toBeNull();
  advance(30 * DAY);
  g.prune();
  expect(
    store.db.prepare("SELECT id FROM gallery_posts WHERE id=?").get(pending.id),
  ).toBeUndefined();
  advance(305 * DAY);
  g.prune();
  expect(g.page().total).toBe(0);
  expect(g.eraseAccount(other.id).deleted).toBe(1);
  expect(g.eraseAccount(owner.id).deleted).toBe(0);
});
it("enforces ten live/recent submissions per account and stable bounded public/moderation pagination", () => {
  const { g, owner, other } = setup();
  for (let i = 0; i < 14; i++)
    g.submit(i < 10 ? owner.id : other.id, {
      ...payload(),
      review: i === 0 ? "" : "Clear",
      rating: i === 0 ? 0 : 4,
    });
  expect(() => g.submit(owner.id, payload())).toThrow("limit");
  const first = g.moderation(),
    second = g.moderation("pending", first.next!);
  expect(first.items).toHaveLength(12);
  expect(second.items).toHaveLength(2);
  for (const p of [...first.items, ...second.items])
    g.moderate("admin", p.id, {
      state: "approved",
      revision: p.revision,
      reason: null,
    });
  const a = g.page(),
    b = g.page(a.next!);
  expect(a.items).toHaveLength(12);
  expect(b.items).toHaveLength(2);
  expect(new Set([...a.items, ...b.items].map((p) => p.id)).size).toBe(14);
  expect(a.total).toBe(14);
  expect(a.averageRating).toBe(4);
  for (const bad of ["invalid", "1e5.bad", "NaN." + owner.id, "-1." + owner.id])
    expect(() => g.page(bad)).toThrow();
});
it("decodes RGB/RGBA with independent UPNG and strips all metadata and hidden alpha pixels", () => {
  const width = 128,
    height = 96,
    pixels = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    pixels[i * 4] = i % 256;
    pixels[i * 4 + 1] = (i * 7) % 256;
    pixels[i * 4 + 2] = 80;
    pixels[i * 4 + 3] = i % 3 ? 255 : 0;
  }
  const independent = Buffer.from(
    UPNG.encode([pixels.buffer], width, height, 0, undefined, undefined, true),
  );
  const withMetadata = Buffer.concat([
    independent.subarray(0, 33),
    pngChunk("tEXt", Buffer.from("private-camera-location")),
    independent.subarray(33),
  ]);
  const normalized = normalizeGalleryImage(withMetadata.toString("base64"));
  expect(
    normalized.image.includes(Buffer.from("private-camera-location")),
  ).toBe(false);
  const decoded = UPNG.decode(
      normalized.image.buffer.slice(
        normalized.image.byteOffset,
        normalized.image.byteOffset + normalized.image.byteLength,
      ),
    ),
    rgba = new Uint8Array(UPNG.toRGBA8(decoded)[0]);
  expect(decoded.width).toBe(width);
  expect(decoded.height).toBe(height);
  for (let i = 0; i < width * height; i++)
    for (let c = 0; c < 3; c++)
      expect(rgba[i * 4 + c]).toBe(i % 3 ? pixels[i * 4 + c] : 255);
});
it("rejects corrupt CRC, animation, oversized dimensions and deflate bombs before unbounded allocation", () => {
  const good = galleryPng(new Uint8Array(96 * 96 * 3).fill(100), 96, 96),
    bad = Buffer.from(good);
  bad[30] ^= 1;
  expect(() => decodeGalleryPng(bad)).toThrow("image");
  const chunk = (type: string, b: Buffer) =>
    Buffer.concat([good.subarray(0, 33), pngChunk(type, b), good.subarray(33)]);
  for (const type of ["acTL", "fcTL", "fdAT", "tRNS", "ABCD"])
    expect(() => decodeGalleryPng(chunk(type, Buffer.alloc(8)))).toThrow(
      "image",
    );
  const header = Buffer.from(good.subarray(16, 29));
  header.writeUInt32BE(1_000_000, 0);
  expect(() =>
    decodeGalleryPng(
      Buffer.concat([
        good.subarray(0, 8),
        pngChunk("IHDR", header),
        good.subarray(33),
      ]),
    ),
  ).toThrow("image");
  const bomb = Buffer.concat([
    good.subarray(0, 33),
    pngChunk("IDAT", deflateSync(Buffer.alloc(10_000_000))),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
  expect(() => decodeGalleryPng(bomb)).toThrow("image");
  for (const value of [
    null,
    "data:image/png;base64,abc",
    "https://private.test/a.png",
    "not base64",
    "A".repeat(3_333_340),
  ])
    expect(() => normalizeGalleryImage(value)).toThrow("image");
});
it("accepts a high-entropy full-size photo without base64 regular-expression stack growth", () => {
  const image = galleryPng(randomBytes(768 * 768 * 3), 768, 768);
  expect(image.length).toBeGreaterThan(1_500_000);
  const result = normalizeGalleryImage(image.toString("base64"));
  expect(result.width).toBe(768);
  expect(result.height).toBe(768);
  const thumb = UPNG.decode(
    result.thumbnail.buffer.slice(
      result.thumbnail.byteOffset,
      result.thumbnail.byteOffset + result.thumbnail.byteLength,
    ),
  );
  expect(thumb.width).toBe(240);
  expect(thumb.height).toBe(240);
});
