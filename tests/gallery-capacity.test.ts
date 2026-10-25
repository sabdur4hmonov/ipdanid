import { test, expect } from "vitest";
import { KitStore } from "../server/kit-store";
import { GalleryStore } from "../server/gallery-store";
import { galleryPng, normalizeGalleryImage } from "../server/gallery-image";
import { GALLERY_CONSENT } from "../src/gallery-types";
function fixture(limits: { maxItems: number; maxBytes: number }) {
  const store = new KitStore(":memory:", "p".repeat(32), "k".repeat(32));
  let now = 1800000000000;
  const a = store.createGuest(),
    b = store.createGuest();
  store.db.prepare("UPDATE users SET role='maker'").run();
  const gallery = new (GalleryStore as any)(
    store,
    () => now,
    limits,
  ) as GalleryStore;
  const body = () => ({
    title: "Original fixture",
    alias: "Synthetic maker",
    review: "",
    rating: 0,
    image: galleryPng(new Uint8Array(96 * 96 * 3).fill(150), 96, 96).toString(
      "base64",
    ),
    requestKey: crypto.randomUUID(),
    consentVersion: GALLERY_CONSENT,
    consent: true,
    finished: true,
    rights: true,
    publish: true,
  });
  return {
    store,
    a,
    b,
    gallery,
    body,
    advance: () => {
      now += 31 * 86400000;
    },
  };
}
test("global gallery item cap spans accounts; replay works at capacity and withdrawal/expiry release it", () => {
  const f = fixture({ maxItems: 1, maxBytes: 1000000 });
  try {
    const body = f.body(),
      first = f.gallery.submit(f.a.id, body);
    expect(f.gallery.submit(f.a.id, body).id).toBe(first.id);
    expect(() => f.gallery.submit(f.b.id, f.body())).toThrow("capacity");
    f.gallery.withdraw(f.a.id, first.id, first.revision);
    const second = f.gallery.submit(f.b.id, f.body());
    expect(second.state).toBe("pending");
    f.advance();
    f.gallery.prune();
    expect(f.gallery.submit(f.a.id, f.body()).state).toBe("pending");
  } finally {
    f.store.close();
  }
});
test("gallery byte cap counts normalized image plus thumbnail and never leaves partial rows", () => {
  const probe = fixture({ maxItems: 10, maxBytes: 1 });
  try {
    const body = probe.body(),
      media = normalizeGalleryImage(body.image);
    expect(media.image.length + media.thumbnail.length).toBeGreaterThan(1);
    expect(() => probe.gallery.submit(probe.a.id, body)).toThrow("capacity");
    expect(
      probe.store.db.prepare("SELECT count(*) n FROM gallery_posts").get()!.n,
    ).toBe(0);
  } finally {
    probe.store.close();
  }
});
