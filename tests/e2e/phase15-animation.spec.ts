import { animationText } from "../../src/animation-i18n";
import { newEvidenceRoot } from "../helpers/evidence-paths";
import { test, expect } from "@playwright/test";
import { photoCases, gallery, english } from "./phase12-cases";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { referenceRaster } from "../../src/core/classic-reference";
import { generateClassic } from "../../src/core/classic";
import { createProfile } from "../../src/core/geometry";
import { progressFor } from "../../src/core/validation";
import { DEFAULT_EDITS } from "../../src/core/types";
import { animationThumbnail } from "../../src/core/sequence-animation";
import UPNGModule from "@pdf-lib/upng";
async function digest(canvas: any) {
  return canvas.evaluate(async (c: HTMLCanvasElement) => {
    const bytes = c
      .getContext("2d")!
      .getImageData(0, 0, c.width, c.height).data;
    return Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    )
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("");
  });
}
test("ordinary v3 result exports actual video and GIF with exact final physical pixels, responsive cancel and released tracks", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await page.addInitScript(() => {
    const w = window as any;
    w.__animationStreams = [];
    w.__ticks = 0;
    setInterval(() => w.__ticks++, 50);
    const capture = HTMLCanvasElement.prototype.captureStream;
    HTMLCanvasElement.prototype.captureStream = function (...args) {
      const stream = capture.apply(this, args);
      w.__animationStreams.push(stream);
      return stream;
    };
  });
  await page.goto("/");
  await english(page);
  await gallery(page, photoCases[0]);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByTestId("customer-result")).toBeVisible({
    timeout: 60000,
  });
  const g = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("iprasm.projects.v1")!)[0].instruction,
  );
  expect(g.algorithm).toBe("classic-greedy/3");
  expect(g.metrics.lines).toBe(3000);
  await page.locator(".customer-details>summary").click();
  const ui = page.getByTestId("sequence-animation"),
    canvas = page.getByTestId("animation-canvas"),
    out = newEvidenceRoot(`output/current-animation/${info.project.name}`);
  mkdirSync(out, { recursive: true });
  await ui
    .getByRole("button", { name: "Download thread video", exact: true })
    .click();
  await expect(
    ui.getByRole("button", { name: "Cancel animation", exact: true }),
  ).toBeVisible();
  await ui
    .getByRole("button", { name: "Cancel animation", exact: true })
    .click();
  await expect(
    ui.getByRole("button", { name: "Download thread video", exact: true }),
  ).toBeEnabled();
  const ticks = await page.evaluate(() => (window as any).__ticks),
    event = page.waitForEvent("download");
  await ui
    .getByRole("button", { name: "Download thread video", exact: true })
    .click();
  const video = await event;
  await video.saveAs(out + "/sequence.webm");
  await expect(
    ui.getByRole("button", { name: "Download thread video", exact: true }),
  ).toBeEnabled();
  expect(
    (await page.evaluate(() => (window as any).__ticks)) - ticks,
  ).toBeGreaterThan(20);
  expect(
    await page.evaluate(() =>
      (window as any).__animationStreams.every((s: MediaStream) =>
        s.getTracks().every((t) => t.readyState === "ended"),
      ),
    ),
  ).toBe(true);
  const raster = referenceRaster(g, 1000),
    rgba = new Uint8Array(4_000_000);
  for (let k = 0; k < 1_000_000; k++) {
    for (let c = 0; c < 3; c++)
      rgba[k * 4 + c] = Math.round(raster[k * 3 + c] * 255);
    rgba[k * 4 + 3] = 255;
  }
  expect(await digest(canvas)).toBe(
    createHash("sha256").update(rgba).digest("hex"),
  );
  expect(await digest(canvas)).toBe(
    await digest(page.getByTestId("customer-thread-result")),
  );
  expect(await canvas.getAttribute("data-animation-completed")).toBe("3000");
  const gifEvent = page.waitForEvent("download");
  await ui
    .getByRole("button", { name: "Download thread GIF", exact: true })
    .click();
  await (await gifEvent).saveAs(out + "/sequence.gif");
  await expect(
    ui.getByRole("button", { name: "Download thread GIF", exact: true }),
  ).toBeEnabled();
  expect(await digest(canvas)).toBe(
    createHash("sha256").update(rgba).digest("hex"),
  );
  const last = animationThumbnail(Uint8ClampedArray.from(rgba), 1000, 1000),
    UPNG = (UPNGModule as any).default ?? UPNGModule;
  writeFileSync(
    out + "/gif-last.png",
    Buffer.from(UPNG.encode([last.rgba.buffer], last.width, last.height, 0)),
  );
  writeFileSync(out + "/guide.json", JSON.stringify(g));
  await canvas.screenshot({ path: out + "/final.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("unsupported video has a real GIF fallback for an offline legacy guide", async ({
  page,
  context,
}, info) => {
  const profile = {
      ...createProfile("circle", 32),
      baseColor: "#ffffff",
      colors: ["#000000"],
      threadMm: 0.12,
    },
    instruction = await generateClassic({
      profile,
      resolution: 32,
      lines: 40,
      mode: "dark",
      pixels: new Uint8Array(32 * 32 * 3).fill(80),
    }),
    project = {
      id: "animation-legacy",
      name: "Animation legacy",
      instruction,
      progress: progressFor(instruction),
      edits: { ...DEFAULT_EDITS },
    };
  await page.addInitScript((project) => {
    localStorage.setItem("iprasm.projects.v1", JSON.stringify([project]));
    localStorage.setItem("iprasm.locale", "en");
    localStorage.setItem(
      "iprasm.assembly-session.v1",
      JSON.stringify({
        version: 1,
        projectId: project.id,
        sequenceHash: project.instruction.sequenceHash,
        current: 1,
        pace: 8,
      }),
    );
    Object.defineProperty(window, "MediaRecorder", {
      configurable: true,
      value: undefined,
    });
  }, project);
  await page.goto("/");
  await expect(page.getByTestId("assembly-focus")).toBeVisible();
  await page.locator("summary").filter({ hasText: animationText("en", "title") }).click();
  const ui = page.getByTestId("sequence-animation");
  await expect(
    ui.getByRole("button", { name: "Download thread video", exact: true }),
  ).toBeDisabled();
  await expect(ui).toContainText("Video recording is unavailable");
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await context.setOffline(true);
  const event = page.waitForEvent("download");
  await ui
    .getByRole("button", { name: "Download thread GIF", exact: true })
    .click();
  const file = await event,
    out = newEvidenceRoot(`output/current-animation/${info.project.name}`);
  mkdirSync(out, { recursive: true });
  await file.saveAs(out + "/legacy.gif");
  await expect(page.getByTestId("animation-canvas")).toHaveAttribute(
    "data-animation-completed",
    String(instruction.metrics.lines),
  );
  await context.setOffline(false);
});
