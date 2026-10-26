import { newEvidenceRoot } from "../helpers/evidence-paths";
import { test, expect } from "./legacy-test";
import type { Page } from "@playwright/test";
import { openMore } from "./navigation";
import { galleryPng } from "../../server/gallery-image";
import { GALLERY_CONSENT } from "../../src/gallery-types";
import { mkdirSync, writeFileSync } from "node:fs";
// These cases inject network responses; dedicated offline suites retain service workers.
test.use({ serviceWorkers: "block" });

test.use({ trace: "off" });
const network = new WeakMap<Page, unknown[]>();
test.beforeEach(async ({ page }) => {
  const events: unknown[] = [];
  network.set(page, events);
  page.on("response", (response) => {
    const path = new URL(response.url()).pathname;
    if (path.startsWith("/api/"))
      events.push({ path, status: response.status() });
  });
  page.on("requestfailed", (request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith("/api/"))
      events.push({ path, failed: request.failure()?.errorText });
  });
});
test.afterEach(async ({ page }, info) => {
  writeFileSync(
    info.outputPath("gallery-network.json"),
    JSON.stringify(network.get(page) ?? [], null, 2),
  );
});
function fixture() {
  const pixels = new Uint8Array(256 * 256 * 3).fill(245);
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      const d = Math.hypot(x - 128, y - 128),
        on =
          (d > 96 && d < 100) || Math.abs(y - 128 - Math.sin(x / 18) * 55) < 2;
      if (on) pixels.set([40, 90, 65], (y * 256 + x) * 3);
    }
  return galleryPng(pixels, 256, 256);
}
async function enter(page: Page) {
  await page.goto("/");
  await page.locator('[data-testid="locale-picker"]:visible').selectOption("en");
  await openMore(page);
  await page
    .getByRole("button", { name: "Account & shop", exact: true })
    .click();
}
async function gallery(page: Page) {
  await page
    .locator(".customer-tabs")
    .getByRole("button", { name: "Customer gallery", exact: true })
    .click();
  await expect(page.getByTestId("gallery-studio")).toBeVisible();
}
async function register(page: Page) {
  const hub = page.locator(".customer-hub");
  await hub
    .getByRole("button", { name: "Start sandbox session", exact: true })
    .click();
  await hub
    .getByLabel("Email", { exact: true })
    .fill("gallery-" + crypto.randomUUID() + "@example.com");
  await hub
    .getByLabel("Password (at least 12 characters)", { exact: true })
    .fill("isolated gallery test password");
  await hub
    .getByRole("button", { name: "Register this account", exact: true })
    .click();
  await expect(hub.locator(".recovery-key code")).toBeVisible();
}
async function fill(page: Page, name: string, jpeg = false) {
  let bytes = fixture();
  if (jpeg) {
    const data = await page.evaluate(async (png) => {
      const image = new Image();
      image.src = "data:image/png;base64," + png;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      canvas.getContext("2d")!.drawImage(image, 0, 0);
      return canvas.toDataURL("image/jpeg", 0.92).split(",")[1];
    }, bytes.toString("base64"));
    bytes = Buffer.from(data, "base64");
  }
  await page.getByLabel("Finished craft photo", { exact: true }).setInputFiles({
    name: jpeg ? "original-fixture.jpg" : "original-fixture.png",
    mimeType: jpeg ? "image/jpeg" : "image/png",
    buffer: bytes,
  });
  await expect(
    page.getByRole("img", { name: "Finished craft photo", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Craft title", { exact: true }).fill(name);
  await page
    .getByLabel("Public display name", { exact: true })
    .fill("Original test maker");
  await page
    .getByLabel("Feedback (optional)", { exact: true })
    .fill("The original workshop steps were useful.");
}
async function consent(page: Page) {
  await page
    .getByLabel("This is a photo of my finished craft.", { exact: true })
    .check();
  await page
    .getByLabel(
      "I have the right to share this photo and the consent of anyone shown.",
      { exact: true },
    )
    .check();
  await page.getByLabel(/^I agree to publish this image/).check();
}
test("visitor views approved-only gallery; JPEG submission requires consent, owner moderates, maker withdraws", async ({
  page,
  context,
  request,
}, info) => {
  test.setTimeout(150000);
  await enter(page);
  await gallery(page);
  await expect(
    page.getByText("Sign in with a kit code or registered account to submit.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Finished craft photo", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Open account", exact: true }).click();
  await register(page);
  await gallery(page);
  const title = "Original consented craft " + crypto.randomUUID().slice(0, 8);
  await fill(page, title, true);
  const submit = page.getByRole("button", {
    name: "Submit finished craft",
    exact: true,
  });
  await expect(submit).toBeDisabled();
  await page
    .getByLabel("This is a photo of my finished craft.", { exact: true })
    .check();
  await expect(submit).toBeDisabled();
  await consent(page);
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByRole("status")).toContainText("Submitted for review");
  const mine = page
    .getByTestId("my-gallery")
    .getByTestId("gallery-post")
    .filter({ hasText: title });
  await expect(mine).toContainText("Pending review");
  const id = (await mine.getAttribute("data-gallery-id"))!;
  expect((await request.get(`/api/gallery/${id}/image`)).status()).toBe(404);
  expect(
    (await (await request.get("/api/gallery")).json()).items.some(
      (p: any) => p.id === id,
    ),
  ).toBe(false);
  await page
    .locator(".customer-tabs")
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  await page
    .getByLabel("Administrator token", { exact: true })
    .fill(process.env.LOCAL_ADMIN_TOKEN!);
  await page
    .getByRole("button", { name: "Open administration", exact: true })
    .click();
  const moderation = page.getByTestId("gallery-moderation"),
    pending = moderation.getByTestId("gallery-post").filter({ hasText: title });
  await expect(pending).toBeVisible();
  await pending
    .getByRole("button", { name: "View larger", exact: true })
    .click();
  await expect(
    moderation.getByTestId("gallery-large-image").locator("img"),
  ).toBeVisible();
  await pending
    .getByRole("button", { name: "Approve publication", exact: true })
    .click();
  await expect(pending).toHaveCount(0);
  await gallery(page);
  const publicPost = page
    .getByTestId("public-gallery")
    .getByTestId("gallery-post")
    .filter({ hasText: title });
  await expect(publicPost).toBeVisible();
  await expect(publicPost).toContainText("5/5");
  await publicPost
    .getByRole("button", { name: "View larger", exact: true })
    .click();
  await expect(
    page.getByTestId("gallery-large-image").locator("img"),
  ).toBeVisible();
  const out = newEvidenceRoot(`output/current-gallery/${info.project.name}`);
  mkdirSync(out, { recursive: true });
  await page
    .getByTestId("gallery-studio")
    .screenshot({ path: out + "/approved.png" });
  const publicResponse = await request.get("/api/gallery");
  expect(publicResponse.headers()["cache-control"]).toBe("no-store");
  const mediaResponse=await request.get(`/api/gallery/${id}/image`),media=await mediaResponse.json();
  expect(mediaResponse.headers()["cache-control"]).toBe("no-store");
  writeFileSync(out+"/approved-normalized.png",Buffer.from(media.image,"base64"));
  const published=(await publicResponse.json()).items.find((p:any)=>p.id===id);
  writeFileSync(out+"/approved-thumbnail.png",Buffer.from(published.thumbnail,"base64"));
  const cached=await page.evaluate(async()=>{
    const urls:string[]=[];for(const key of await caches.keys())for(const request of await (await caches.open(key)).keys())urls.push(new URL(request.url).pathname);
    return urls.filter(path=>path.startsWith("/api/"));
  });
  expect(cached).toEqual([]);
  writeFileSync(
    out + "/public-proof.json",
    JSON.stringify(
      {
        status: publicResponse.status(),
        approvedId: id,
        hasCredentials: false,
        sourcePhoto: false,
      },
      null,
      2,
    ),
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await mine
    .getByRole("button", { name: "Withdraw and delete", exact: true })
    .click();
  await expect(mine).toHaveCount(0);
  await expect(publicPost).toHaveCount(0);
  expect((await request.get(`/api/gallery/${id}/image`)).status()).toBe(404);
  const visitor = await context.newPage();
  await enter(visitor);
  await gallery(visitor);
  await expect(visitor.getByTestId("public-gallery")).not.toContainText(title);
  await visitor.close();
});
test("lost submit response retries the identical post; rejection and stale withdrawal preserve private state", async ({
  page,
  request,
}, info) => {
  await enter(page);
  await register(page);
  await gallery(page);
  const title = "Retry craft " + crypto.randomUUID().slice(0, 8);
  await fill(page, title);
  await consent(page);
  let first = true;
  const keys: string[] = [];
  await page.route("**/api/gallery/submit", async (route) => {
    keys.push(route.request().postDataJSON().requestKey);
    if (first) {
      first = false;
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  const button = page.getByRole("button", {
    name: "Submit finished craft",
    exact: true,
  });
  await button.click();
  await expect(page.getByRole("alert")).toContainText("retry");
  await button.click();
  await expect(page.getByRole("status")).toContainText("Submitted for review");
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
  const mine = page.getByTestId("my-gallery").getByTestId("gallery-post");
  await expect(mine).toHaveCount(1);
  const id = (await mine.getAttribute("data-gallery-id"))!;
  const admin = { Authorization: "Bearer " + process.env.LOCAL_ADMIN_TOKEN };
  const rejected = await request.post(`/api/admin/gallery/${id}/moderate`, {
    headers: admin,
    data: { revision: 1, state: "rejected", reason: "privacy" },
  });
  expect(rejected.ok()).toBe(true);
  await mine
    .getByRole("button", { name: "Withdraw and delete", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("another window");
  await page
    .getByRole("button", { name: "Refresh gallery", exact: true })
    .click();
  await expect(mine).toContainText("Not published");
  await expect(mine).toContainText("Personal information");
  const out = newEvidenceRoot(`output/current-gallery/${info.project.name}`);
  mkdirSync(out, { recursive: true });
  await mine.screenshot({ path: out + "/rejected.png" });
  await mine
    .getByRole("button", { name: "Withdraw and delete", exact: true })
    .click();
  await expect(mine).toHaveCount(0);
  await page
    .locator(".customer-session")
    .getByRole("button", { name: "Sign out", exact: true })
    .click();
  await gallery(page);
  await expect(page.getByTestId("my-gallery")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open account", exact: true }),
  ).toBeVisible();
});
test("real HTTP gallery rejects forged consent, ownership and staff escalation and strips private fields", async ({
  request,
}) => {
  const root = { Authorization: "Bearer " + process.env.LOCAL_ADMIN_TOKEN };
  const guest = await (await request.post("/api/session", { data: {} })).json();
  const registered = await request.post("/api/account/register", {
    headers: { Authorization: "Bearer " + guest.token },
    data: {
      email: "gallery-http-" + crypto.randomUUID() + "@example.com",
      password: "isolated gallery account password",
    },
  });
  expect(registered.ok()).toBe(true);
  const owner = await registered.json(),
    headers = { Authorization: "Bearer " + owner.token },
    other = await (await request.post("/api/session", { data: {} })).json();
  const body = {
    title: "Original HTTP craft",
    alias: "Synthetic maker",
    review: "",
    rating: 0,
    image: fixture().toString("base64"),
    requestKey: crypto.randomUUID(),
    consentVersion: GALLERY_CONSENT,
    consent: true,
    finished: true,
    rights: true,
    publish: true,
  };
  expect(
    (await request.post("/api/gallery/submit", { data: body })).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/gallery/submit", {
        headers: { Authorization: "Bearer " + other.token },
        data: body,
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/gallery/submit", {
        headers,
        data: { ...body, consent: false },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/gallery/submit", {
        headers,
        data: { ...body, image: "https://private.example/photo.jpg" },
      })
    ).status(),
  ).toBe(400);
  const made = await request.post("/api/gallery/submit", {
    headers,
    data: body,
  });
  expect(made.status()).toBe(201);
  const post = await made.json();
  expect((await request.get(`/api/gallery/${post.id}/image`)).status()).toBe(
    404,
  );
  expect(
    (
      await request.get(`/api/gallery/mine/${post.id}/image`, {
        headers: { Authorization: "Bearer " + other.token },
      })
    ).status(),
  ).toBe(404);
  expect((await request.get("/api/admin/gallery", { headers })).status()).toBe(
    403,
  );
  const finance = await (
    await request.post("/api/admin/access", {
      headers: root,
      data: { name: "Gallery denied finance", role: "finance", days: 1 },
    })
  ).json();
  expect(
    (
      await request.get("/api/admin/gallery", {
        headers: { Authorization: "Bearer " + finance.token },
      })
    ).status(),
  ).toBe(403);
  const support = await (
      await request.post("/api/admin/access", {
        headers: root,
        data: { name: "Gallery moderator", role: "support", days: 1 },
      })
    ).json(),
    mod = { Authorization: "Bearer " + support.token };
  expect(
    (await request.get("/api/admin/gallery", { headers: mod })).status(),
  ).toBe(200);
  expect(
    (
      await request.post(`/api/admin/gallery/${post.id}/moderate`, {
        headers: mod,
        data: { revision: 1, state: "approved", reason: null },
      })
    ).ok(),
  ).toBe(true);
  const publicItem = (
    await (await request.get("/api/gallery")).json()
  ).items.find((p: any) => p.id === post.id);
  expect(publicItem).toBeTruthy();
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
  expect(
    (
      await request.post(`/api/gallery/${post.id}/withdraw`, {
        headers: { Authorization: "Bearer " + other.token },
        data: { revision: 2 },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await request.post(`/api/gallery/${post.id}/withdraw`, {
        headers,
        data: { revision: 2 },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await request.get(`/api/admin/gallery/${post.id}/image`, { headers: mod })
    ).status(),
  ).toBe(404);
  const retry = await (
    await request.post("/api/gallery/submit", { headers, data: body })
  ).json();
  expect(retry.state).toBe("deleted");
  expect(retry.thumbnail).toBe("");
});
test("production health protocol permits the real registered customer and gallery flow", async ({
  page,
}) => {
  await page.route("**/api/health", (route) =>
    route.fulfill({
      json: {
        sandbox: false,
        apiVersion: "product-api/3",
        adminAuth: "token",
        livePayments: false,
        liveMessages: false,
      },
    }),
  );
  await enter(page);
  await register(page);
  await expect(page.locator(".customer-session")).toContainText("@example.com");
  await gallery(page);
  await expect(
    page.getByLabel("Finished craft photo", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".sandbox-notice")).toHaveCount(0);
});
