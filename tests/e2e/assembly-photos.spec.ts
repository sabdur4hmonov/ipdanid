import { test, expect, type Page } from "@playwright/test";
import { audioFixture } from "./assembly-audio-fixture";
import { unlockKitGuide } from "./kit-access";
test.use({
  trace: "off",
  launchOptions: {
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  },
});
async function expert(page: Page) {
  await page.locator(".more-menu > summary").click();
  await page
    .locator(".more-menu")
    .getByRole("button", { name: "Expert mode", exact: true })
    .click();
  const panel = page.getByTestId("assembly-photos");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("checkbox")).not.toBeChecked();
  await panel.getByRole("checkbox").check();
  return panel;
}
async function rows(page: Page) {
  return page.evaluate(
    () =>
      new Promise<any[]>((resolve, reject) => {
        const r = indexedDB.open("iprasm.board-checkpoints", 1);
        r.onerror = () => reject(r.error);
        r.onsuccess = () => {
          const db = r.result,
            q = db.transaction("photos").objectStore("photos").getAll();
          q.onsuccess = () => {
            db.close();
            resolve(
              q.result.map((p) => ({
                id: p.id,
                step: p.step,
                total: p.total,
                sequenceHash: p.sequenceHash,
                size: p.blob.size,
                type: p.blob.type,
                keys: Object.keys(p),
              })),
            );
          };
          q.onerror = () => {
            db.close();
            reject(q.error);
          };
        };
      }),
  );
}
async function capture(page: Page, panel: ReturnType<Page["getByTestId"]>) {
  await panel.getByRole("button", { name: "Take photo", exact: true }).click();
  const dialog = panel.getByRole("dialog", { name: "Camera", exact: true });
  await expect(
    dialog.getByRole("button", { name: "Use this photo", exact: true }),
  ).toBeEnabled();
  await page.evaluate(() => {
    (window as any).__boardTracks = (
      document.querySelector("video")!.srcObject as MediaStream
    ).getTracks();
  });
  await dialog
    .getByRole("button", { name: "Use this photo", exact: true })
    .click();
  await expect(panel.getByTestId("board-photo-compare")).toBeVisible();
  expect(
    await page.evaluate(() =>
      (window as any).__boardTracks.every(
        (t: MediaStreamTrack) => t.readyState === "ended",
      ),
    ),
  ).toBe(true);
}
test("opt-in board capture is local, manually saved at the exact step and available after offline restart", async ({
  page,
  context,
}) => {
  const guide = await audioFixture(page, { web: true });
  await context.grantPermissions(["camera"]);
  await page.goto("/");
  await unlockKitGuide(page);
  const uploads: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && /\/api\/(photo-backup|gallery)/.test(r.url()))
      uploads.push(r.url());
  });
  await expect(page.getByTestId("assembly-photos")).toHaveCount(0);
  let panel = await expert(page);
  await capture(page, panel);
  const compare = panel.getByTestId("board-photo-compare");
  await expect(compare).toHaveAttribute("data-step", "1");
  await expect(compare).toHaveAttribute(
    "data-sequence-hash",
    guide.sequenceHash,
  );
  // A quota failure must retain the captured photo and leave no partial row.
  await page.evaluate(() => {
    const old = IDBObjectStore.prototype.put;
    (window as any).__boardPut = old;
    IDBObjectStore.prototype.put = function (
      ...args: Parameters<IDBObjectStore["put"]>
    ) {
      if (this.name === "photos")
        throw new DOMException("Synthetic quota", "QuotaExceededError");
      return old.apply(this, args);
    };
  });
  await panel
    .getByRole("button", { name: "Save this step photo", exact: true })
    .click();
  await expect(panel.getByRole("alert")).toContainText("could not");
  expect(await rows(page)).toHaveLength(0);
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = (window as any).__boardPut;
  });
  await panel
    .getByRole("button", { name: "Save this step photo", exact: true })
    .click();
  await expect(panel.getByTestId("board-photo-list").locator("li")).toHaveCount(
    1,
  );
  const stored = await rows(page);
  expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({
    step: 1,
    total: 80,
    sequenceHash: guide.sequenceHash,
    type: "image/jpeg",
  });
  expect(stored[0].size).toBeLessThanOrEqual(524288);
  expect(
    stored[0].keys.some((k: string) =>
      /token|account|original|source|file/i.test(k),
    ),
  ).toBe(false);
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(compare).toHaveCount(0);
  await panel
    .getByRole("button", { name: "Compare photo", exact: true })
    .click();
  await expect(compare).toHaveAttribute("data-step", "1");
  await expect(page.getByTestId("confirmed-step")).toHaveText("0/80");
  await panel.screenshot({
    path: test.info().outputPath("board-comparison.png"),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId("assembly-photos")).toHaveCount(0);
  panel = await expert(page);
  await expect(panel.getByTestId("board-photo-list").locator("li")).toHaveCount(
    1,
  );
  await panel
    .getByRole("button", { name: "Compare photo", exact: true })
    .click();
  await expect(panel.getByTestId("board-photo-compare")).toHaveAttribute(
    "data-step",
    "1",
  );
  await panel
    .getByRole("button", { name: "Open this step", exact: true })
    .click();
  await expect(page.getByTestId("confirmed-step")).toHaveText("0/80");
  await panel
    .getByRole("button", { name: "Delete photo", exact: true })
    .click();
  await expect(panel.getByTestId("board-photo-list").locator("li")).toHaveCount(
    0,
  );
  expect(await rows(page)).toHaveLength(0);
  expect(uploads).toEqual([]);
});
test("camera denial and delayed camera permission cannot keep a stream after cancel or change the cursor", async ({
  page,
  context,
}) => {
  await audioFixture(page, { web: true });
  await context.grantPermissions(["camera"]);
  await page.goto("/");
  await unlockKitGuide(page);
  const panel = await expert(page);
  await page.evaluate(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    (window as any).__boardCamera = original;
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("Synthetic denial", "NotAllowedError");
    };
  });
  await panel.getByRole("button", { name: "Take photo", exact: true }).click();
  await expect(panel.getByRole("alert")).toContainText("denied");
  await expect(page.getByTestId("confirmed-step")).toHaveText("0/80");
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = async (o) => {
      const stream = await (window as any).__boardCamera(o);
      (window as any).__lateBoardTracks = stream.getTracks();
      await new Promise<void>(
        (r) => ((window as any).__releaseBoardCamera = r),
      );
      return stream;
    };
  });
  await panel.getByRole("button", { name: "Take photo", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => typeof (window as any).__releaseBoardCamera),
    )
    .toBe("function");
  await panel
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page.evaluate(() => (window as any).__releaseBoardCamera());
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).__lateBoardTracks.every(
          (t: MediaStreamTrack) => t.readyState === "ended",
        ),
      ),
    )
    .toBe(true);
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = (window as any).__boardCamera;
  });
  await panel.getByRole("button", { name: "Take photo", exact: true }).click();
  await expect(
    panel
      .getByRole("dialog")
      .getByRole("button", { name: "Use this photo", exact: true }),
  ).toBeEnabled();
  await page.evaluate(() => {
    (window as any).__leavingBoardTracks = (
      document.querySelector("video")!.srcObject as MediaStream
    ).getTracks();
  });
  // A real cursor change unmounts the camera, even if navigation is triggered while its dialog is open.
  await page
    .getByTestId("assembly-focus")
    .getByRole("button", { name: "Next step", exact: true })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(panel.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      (window as any).__leavingBoardTracks.every(
        (t: MediaStreamTrack) => t.readyState === "ended",
      ),
    ),
  ).toBe(true);
  await expect(panel.getByTestId("board-photo-compare")).toHaveCount(0);
  await expect(page.getByTestId("confirmed-step")).toHaveText("0/80");
});
