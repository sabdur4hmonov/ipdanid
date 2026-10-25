import { openMore, revealControl } from "./navigation";
import { test, expect } from "./legacy-test";
import { readFileSync, mkdirSync } from "node:fs";
test.use({
  launchOptions: {
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  },
});

test("browser camera captures an actual frame into crop; cancel and navigation release all video tracks", async ({
  page,
  context,
}, info) => {
  await context.grantPermissions(["camera"]);
  await page.goto("/");
  await page.locator('[data-testid="locale-picker"]:visible').selectOption("en");
  await expect(
    page.getByRole("button", { name: "Upload from gallery", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Take photo", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Camera", exact: true });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Use this photo" }),
  ).toBeEnabled();
  await page.evaluate(() => {
    (window as any).__tracks = (
      document.querySelector("video")!.srcObject as MediaStream
    ).getTracks();
  });
  await dialog.getByRole("button", { name: "Use this photo" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByLabel("Edited photo", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() =>
      (window as any).__tracks.every(
        (t: MediaStreamTrack) => t.readyState === "ended",
      ),
    ),
  ).toBe(true);
  await expect(page.getByTestId("shape-crop")).toHaveAttribute(
    "data-edits",
    /"zoom":1/,
  );
  await page.getByTestId("advanced-photo").locator("summary").first().click();
  await page.getByText("Zoom · Contrast", { exact: true }).click();
  await revealControl(page.getByLabel("Zoom", { exact: true }));
  await page.getByLabel("Zoom", { exact: true }).fill("1.3");
  const crop = await page.getByTestId("shape-crop").getAttribute("data-edits"),
    source = await page
      .getByLabel("Edited photo", { exact: true })
      .evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.getByRole("button", { name: "Take photo", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Use this photo" }),
  ).toBeEnabled();
  await page.evaluate(() => {
    (window as any).__tracks = (
      document.querySelector("video")!.srcObject as MediaStream
    ).getTracks();
  });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(
    await page.evaluate(() =>
      (window as any).__tracks.every(
        (t: MediaStreamTrack) => t.readyState === "ended",
      ),
    ),
  ).toBe(true);
  expect(await page.getByTestId("shape-crop").getAttribute("data-edits")).toBe(
    crop,
  );
  expect(
    await page
      .getByLabel("Edited photo", { exact: true })
      .evaluate((c: HTMLCanvasElement) => c.toDataURL()),
  ).toBe(source);
  await page.locator('[data-testid="locale-picker"]:visible').selectOption("uz");
  await expect(
    page.getByRole("button", { name: "Galereyadan yuklash", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Rasmga olish", exact: true }),
  ).toBeVisible();
  mkdirSync("output/camera", { recursive: true });
  await page.screenshot({
    path: `output/camera/${info.project.name}-capture.png`,
    fullPage: true,
  });
  // A pending getUserMedia response after cancellation is also disposed; no camera leak.
  await page.evaluate(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    (window as any).__originalCamera = original;
    navigator.mediaDevices.getUserMedia = async (options) => {
      const media = await original(options);
      (window as any).__lateTracks = media.getTracks();
      await new Promise<void>((r) => ((window as any).__releaseCamera = r));
      return media;
    };
  });
  await page.getByRole("button", { name: "Rasmga olish", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => !!(window as any).__releaseCamera))
    .toBe(true);
  await page.getByRole("button", { name: "Bekor qilish", exact: true }).click();
  await page.evaluate(() => (window as any).__releaseCamera());
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).__lateTracks.every(
          (t: MediaStreamTrack) => t.readyState === "ended",
        ),
      ),
    )
    .toBe(true);
  // Confirm React unmount also ends an active stream (synthetic nav click while modal).
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = (window as any).__originalCamera;
  });
  await page.getByRole("button", { name: "Rasmga olish", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Shu rasmni ishlatish", exact: true }),
  ).toBeEnabled();
  await page.evaluate(() => {
    (window as any).__tracks = (
      document.querySelector("video")!.srcObject as MediaStream
    ).getTracks();
    Array.from(document.querySelectorAll<HTMLButtonElement>("nav button"))
      .find((b) => b.getAttribute("aria-label") === "Loyihalarim")!
      .click();
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).__tracks.every(
          (t: MediaStreamTrack) => t.readyState === "ended",
        ),
      ),
    )
    .toBe(true);
  await page
    .locator("nav")
    .getByRole("button", { name: "Yaratish", exact: true })
    .click();
  // Missing browser API is actionable and does not attempt an empty import.
  await page.evaluate(() => {
    (navigator.mediaDevices as any).getUserMedia = undefined;
  });
  await page.getByRole("button", { name: "Rasmga olish", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Kamera ochilmadi");
});

test("camera denial is localized and retains the valid photo; stale photo decoding cannot replace a newer source", async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("Denied", "NotAllowedError");
    };
    const original = createImageBitmap.bind(window);
    window.createImageBitmap = (async (
      ...args: Parameters<typeof createImageBitmap>
    ) => {
      if (args[0] instanceof File && args[0].name === "slow.png")
        await new Promise<void>((r) => ((window as any).__releasePhoto = r));
      return (original as any)(...args);
    }) as typeof createImageBitmap;
  });
  await page.goto("/");
  await page.locator('[data-testid="locale-picker"]:visible').selectOption("en");
  await page.getByLabel("Upload from gallery", { exact: true }).setInputFiles({
    name: "slow.png",
    mimeType: "image/png",
    buffer: readFileSync("tests/fixtures/transparency.png"),
  });
  await expect
    .poll(() => page.evaluate(() => !!(window as any).__releasePhoto))
    .toBe(true);
  await page.locator(".photo-card").evaluate(
    (el, bytes) => {
      const data = new DataTransfer();
      data.items.add(
        new File([new Uint8Array(bytes)], "fast.jpg", { type: "image/jpeg" }),
      );
      el.dispatchEvent(
        new DragEvent("drop", { bubbles: true, dataTransfer: data }),
      );
    },
    Array.from(readFileSync("tests/fixtures/orientation-6.jpg")),
  );
  await expect(page.getByLabel("Edited photo", { exact: true })).toBeVisible();
  const source = await page
    .getByLabel("Edited photo", { exact: true })
    .evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.evaluate(() => (window as any).__releasePhoto());
  await expect(
    page.getByRole("status").filter({ hasText: "Loading photo" }),
  ).toHaveCount(0);
  expect(
    await page
      .getByLabel("Edited photo", { exact: true })
      .evaluate((c: HTMLCanvasElement) => c.toDataURL()),
  ).toBe(source);
  await page.getByRole("button", { name: "Take photo", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Camera access was denied",
  );
  expect(
    await page
      .getByLabel("Edited photo", { exact: true })
      .evaluate((c: HTMLCanvasElement) => c.toDataURL()),
  ).toBe(source);
  await page.locator('[data-testid="locale-picker"]:visible').selectOption("ru");
  await page
    .getByRole("button", { name: "Сделать фотографию", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Доступ к камере запрещён",
  );
});

test("grid crafts accept a real captured browser frame and native input contract is explicit", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["camera"]);
  await page.goto("/");
  await page.locator('[data-testid="locale-picker"]:visible').selectOption("en");
  await page.getByText("More", { exact: true }).click();
  await openMore(page);
  await page
    .getByRole("button", { name: "Grid crafts", exact: true }).click();
  await expect(page.getByTestId("native-photo-capture")).toHaveAttribute(
    "accept",
    "image/*",
  );
  await expect(page.getByTestId("native-photo-capture")).toHaveAttribute(
    "capture",
    "environment",
  );
  await page.getByRole("button", { name: "Take photo", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Camera", exact: true });
  await expect(
    dialog.getByRole("button", { name: "Use this photo" }),
  ).toBeEnabled();
  await page.evaluate(() => {
    (window as any).__tracks = (
      document.querySelector("video")!.srcObject as MediaStream
    ).getTracks();
  });
  await dialog.getByRole("button", { name: "Use this photo" }).click();
  await expect(page.getByTestId("background-status")).toHaveAttribute(
    "data-status",
    /ready|failed|manual/,
    { timeout: 45000 },
  );
  await revealControl(page.getByLabel("Grid columns", { exact: true }));
  await page.getByLabel("Grid columns", { exact: true }).fill("8");
  await revealControl(page.getByLabel("Grid rows", { exact: true }));
  await page.getByLabel("Grid rows", { exact: true }).fill("8");
  await expect(page.getByLabel("Grid columns", { exact: true })).toHaveValue(
    "8",
  );
  await expect(page.getByLabel("Grid rows", { exact: true })).toHaveValue("8");
  await page
    .getByRole("button", { name: "Create piece guide", exact: true })
    .click();
  await expect(page.getByTestId("grid-progress")).toContainText("0/64");
  expect(
    await page.evaluate(() =>
      (window as any).__tracks.every(
        (t: MediaStreamTrack) => t.readyState === "ended",
      ),
    ),
  ).toBe(true);
  await expect(page.locator("canvas[data-grid-hash]")).toHaveAttribute(
    "data-grid-hash",
    /^[a-f0-9]{64}$/,
  );
});
