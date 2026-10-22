import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import UPNGModule from "@pdf-lib/upng";
import { gallery, photoCases, png } from "./phase12-cases";
import { newEvidenceRoot } from "../helpers/evidence-paths";
import { validateInstruction } from "../../src/core/validation";
import { referenceRaster } from "../../src/core/classic-reference";
import { customerFlowText } from "../../src/customer-flow-i18n";
import type { Instruction } from "../../src/core/types";

test.use({ trace: "off" });
const UPNG =
  (UPNGModule as unknown as { default: typeof UPNGModule }).default ??
  UPNGModule;

for (const shape of ["circle", "rectangle", "heart"] as const) {
  test(`sample portrait: real ${shape} photo, adjustment and physical sequence render`, async ({
    page,
  }, info) => {
    test.setTimeout(150000);
    const out = newEvidenceRoot(
      `output/current-photo-trial/${info.project.name}/${shape}`,
    );
    mkdirSync(out, { recursive: true });
    await page.goto("/");
    const flow = page.getByTestId("customer-flow");
    await expect(flow).toHaveAttribute("data-screen", "start");
    const source = await gallery(page, photoCases[0]);
    await page
      .getByRole("button", {
        name: customerFlowText("uz", shape),
        exact: true,
      })
      .click();
    await page.screenshot({ path: join(out, "start.png"), fullPage: true });
    writeFileSync(join(out, "source.jpg"), source);
    const image = page.getByTestId("customer-photo"),
      baseline = await png(page, "customer-photo"),
      framing = await image.getAttribute("data-framing");
    await expect(
      flow.getByRole("checkbox", {
        name: customerFlowText("uz", "shoulders"),
        exact: true,
      }),
    ).toHaveCount(0);
    const zoom = flow.getByRole("slider", {
      name: customerFlowText("uz", "zoom"),
      exact: true,
    });
    await zoom.fill("1.08");
    await expect.poll(() => png(page, "customer-photo")).not.toBe(baseline);
    await flow
      .getByRole("button", {
        name: new RegExp(customerFlowText("uz", "rotate")),
      })
      .click();
    await expect
      .poll(
        async () =>
          JSON.parse((await image.getAttribute("data-framing"))!).framing
            .rotation,
      )
      .toBe(1);
    await flow
      .getByRole("button", {
        name: customerFlowText("uz", "reset"),
        exact: true,
      })
      .click();
    await expect.poll(() => image.getAttribute("data-framing")).toBe(framing);
    await expect.poll(() => png(page, "customer-photo")).toBe(baseline);
    await flow
      .getByRole("button", {
        name: customerFlowText("uz", "before"),
        exact: true,
      })
      .click();
    await expect.poll(() => png(page, "customer-photo")).not.toBe(baseline);
    await flow
      .getByRole("button", {
        name: customerFlowText("uz", "after"),
        exact: true,
      })
      .click();
    await expect.poll(() => png(page, "customer-photo")).toBe(baseline);
    writeFileSync(join(out, "prepared.png"), Buffer.from(baseline, "base64"));
    await page.screenshot({ path: join(out, "adjust.png"), fullPage: true });
    const start = Date.now();
    await flow
      .getByRole("button", {
        name: customerFlowText("uz", "generate"),
        exact: true,
      })
      .click();
    await expect(page.getByTestId("customer-result")).toBeVisible({
      timeout: 60000,
    });
    const elapsedMs = Date.now() - start;
    expect(elapsedMs).toBeLessThan(15000);
    const result = await png(page, "customer-thread-result");
    writeFileSync(join(out, "result.png"), Buffer.from(result, "base64"));
    await page.screenshot({
      path: join(out, "result-screen.png"),
      fullPage: true,
    });
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("iprasm.projects.v1") ?? "[]")
              .length,
        ),
      )
      .toBeGreaterThan(0);
    const raw = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("iprasm.projects.v1")!)[0].instruction,
    );
    const guide: Instruction = await validateInstruction(raw);
    expect(guide.algorithm).toBe("classic-greedy/3");
    expect(guide.profile.pins).toHaveLength(240);
    expect(guide.metrics.lines).toBe(3000);
    expect(guide.profile.shape).toBe(shape);
    expect(guide.params.kitPreparation!.transform).toEqual(
      JSON.parse(framing!),
    );
    const decoded = UPNG.decode(
      Uint8Array.from(Buffer.from(result, "base64")).buffer,
    );
    expect([decoded.width, decoded.height]).toEqual([1000, 1000]);
    const pixels = new Uint8Array(UPNG.toRGBA8(decoded)[0]),
      exact = Uint8Array.from(referenceRaster(guide, 1000), (v) =>
        Math.round(v * 255),
      );
    expect(
      Buffer.from(pixels.filter((_, k) => k % 4 !== 3)).equals(
        Buffer.from(exact),
      ),
    ).toBe(true);
    await flow
      .getByRole("button", {
        name: customerFlowText("uz", "readjust"),
        exact: true,
      })
      .click();
    expect(await image.getAttribute("data-framing")).toBe(framing);
    expect(await png(page, "customer-photo")).toBe(baseline);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    writeFileSync(
      join(out, "result.json"),
      JSON.stringify(
        {
          shape,
          project: info.project.name,
          elapsedMs,
          algorithm: guide.algorithm,
          pins: guide.profile.pins.length,
          lines: guide.metrics.lines,
          sequenceHash: guide.sequenceHash,
          exactPhysicalRender: true,
          autoFitRestored: true,
          readjustRetained: true,
          shoulderDefault: false,
          ownerPhotoUsed: false,
        },
        null,
        2,
      ),
    );
  });
}
