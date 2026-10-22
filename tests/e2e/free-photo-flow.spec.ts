import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { gallery, photoCases, english, png } from "./phase12-cases";
import { validateInstruction } from "../../src/core/validation";
import { referenceRaster } from "../../src/core/classic-reference";
import UPNGModule from "@pdf-lib/upng";
const UPNG =
  (UPNGModule as unknown as { default: typeof UPNGModule }).default ??
  UPNGModule;
for (const index of [0, 5] as const)
  test(`whole-photo free placement ${index === 0 ? "single" : "pair"}`, async ({
    page,
    context,
  }, info) => {
    // Two full local segmentation passes plus mask editing; generation retains its 15 s bound.
    test.setTimeout(240000);
    const out = `output/current-free-photo/${info.project.name}/${index}`;
    mkdirSync(out, { recursive: true });
    await page.goto("/");
    await english(page);
    await expect(page.locator(".shape-chips")).toHaveCount(0);
    await page.screenshot({ path: out + "/start.png", fullPage: true });
    const jpg = await gallery(page, photoCases[index]);
    writeFileSync(out + "/source.jpg", jpg);
    await expect(page.locator(".shape-chips")).toBeVisible();
    const photo = page.getByTestId("customer-photo"),
      read = async () =>
        JSON.parse((await photo.getAttribute("data-framing"))!);
    for (const name of ["Circle", "Square", "Heart"]) {
      await page.getByRole("button", { name, exact: true }).click();
      const f = await read();
      expect(f.version).toBe("reviewed-free-photo/9");
      expect(f.sourceBounds).toEqual({ left: 0, top: 0, width: 1, height: 1 });
      expect(f.framing.heads).toEqual([]);
      expect(f.framing.keepShoulders).toBe(true);
    }
    const initial = await read(),
      zoom = page.getByRole("slider", { name: "Zoom", exact: true });
    // The visible after image is coloured, not a forced grayscale/head crop.
    expect(
      await photo.evaluate((c: HTMLCanvasElement) => {
        const d = c.getContext("2d")!.getImageData(0, 0, 500, 500).data;
        let colour = 0;
        for (let k = 0; k < d.length; k += 4)
          if (
            Math.max(d[k], d[k + 1], d[k + 2]) -
              Math.min(d[k], d[k + 1], d[k + 2]) >
            15
          )
            colour++;
        return colour;
      }),
    ).toBeGreaterThan(100);
    await zoom.fill("1.8");
    const surface = page.getByTestId("customer-gesture-surface");
    await surface.scrollIntoViewIfNeeded();
    const b = (await surface.boundingBox())!;
    await page.mouse.move(b.x + b.width * 0.5, b.y + b.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width * 0.65, b.y + b.height * 0.55, {
      steps: 5,
    });
    await page.mouse.up();
    expect((await read()).framing.adjustments[0].x).toBeGreaterThan(0.1);
    await page.getByRole("button", { name: "Rotate ↻", exact: true }).click();
    expect((await read()).framing.rotation).toBe(1);
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    expect(await read()).toEqual(initial);
    await surface.scrollIntoViewIfNeeded();
    const pinchBox = (await surface.boundingBox())!,
      x = pinchBox.x + pinchBox.width / 2,
      y = pinchBox.y + pinchBox.height / 2;
    if (info.project.name === "mobile-browser") {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          { x: x - 35, y, id: 1 },
          { x: x + 35, y, id: 2 },
        ],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { x: x - 60, y, id: 1 },
          { x: x + 60, y, id: 2 },
        ],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await cdp.detach();
    } else {
      await page.mouse.move(x, y);
      await page.mouse.wheel(0, -150);
    }
    await expect
      .poll(async () => Number(await zoom.inputValue()))
      .toBeGreaterThan(1.1);
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await page.getByRole("button", { name: "Before", exact: true }).click();
    const before = await png(page, "customer-photo");
    await page.getByRole("button", { name: "After", exact: true }).click();
    expect(await png(page, "customer-photo")).not.toBe(before);
    const cutout = await png(page, "customer-photo");
    await page.getByTestId("edit-cutout").click();
    const editor = page.getByTestId("cutout-editor");
    await editor.scrollIntoViewIfNeeded();
    const eb = (await editor.boundingBox())!;
    await page.mouse.click(
      eb.x + eb.width * (index === 5 ? 0.25 : 0.5),
      eb.y + eb.height * 0.5,
    );
    expect((await png(page, "customer-photo")) !== cutout).toBe(true);
    await page.getByRole("button", { name: "Undo brush", exact: true }).click();
    expect((await png(page, "customer-photo")) === cutout).toBe(true);
    await page.getByTestId("edit-cutout").click();
    await zoom.fill("1.5");
    const chosen = await read();
    await page
      .getByRole("button", { name: "Remove background again", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Create", exact: true }),
    ).toBeEnabled({ timeout: 90000 });
    expect(await read()).toEqual(chosen);
    writeFileSync(
      out + "/cutout.png",
      Buffer.from(await png(page, "customer-photo"), "base64"),
    );
    await page.screenshot({ path: out + "/adjust.png", fullPage: true });
    const start = Date.now();
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByTestId("customer-result")).toBeVisible({
      timeout: 60000,
    });
    const elapsedMs = Date.now() - start;
    expect(elapsedMs).toBeLessThan(15000);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("iprasm.projects.v1") ?? "[]")
              .length,
        ),
      )
      .toBeGreaterThan(0);
    const i = await validateInstruction(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("iprasm.projects.v1")!)[0]
            .instruction,
      ),
    );
    expect(i.params.kitPreparation!.version).toBe("standard-preparation/9");
    expect(i.params.kitPreparation!.transform).toEqual(chosen);
    const result = Buffer.from(
      await png(page, "customer-thread-result"),
      "base64",
    );
    writeFileSync(out + "/result.png", result);
    const decoded = UPNG.decode(Uint8Array.from(result).buffer),
      rgba = new Uint8Array(UPNG.toRGBA8(decoded)[0]);
    expect(
      Buffer.from(rgba.filter((_, k) => k % 4 !== 3)).equals(
        Buffer.from(
          Uint8Array.from(referenceRaster(i, 1000), (v) => Math.round(v * 255)),
        ),
      ),
    ).toBe(true);
    await page.screenshot({ path: out + "/result-screen.png", fullPage: true });
    await page
      .getByRole("button", { name: "Adjust again", exact: true })
      .click();
    expect(await read()).toEqual(chosen);
    writeFileSync(
      out + "/verification.json",
      JSON.stringify(
        {
          elapsedMs,
          exactPhysicalRender: true,
          preparation: i.params.kitPreparation!.version,
          sequenceHash: i.sequenceHash,
        },
        null,
        2,
      ),
    );
  });
