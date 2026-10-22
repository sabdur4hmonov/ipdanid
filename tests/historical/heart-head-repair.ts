import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import UPNGModule from "@pdf-lib/upng";
import { gallery, photoCases, png } from "../e2e/phase12-cases";
import { newEvidenceRoot } from "../helpers/evidence-paths";
import { validateInstruction } from "../../src/core/validation";
import { referenceRaster } from "../../src/core/classic-reference";
import { customerFlowText } from "../../src/customer-flow-i18n";
import { viewingSsim } from "../helpers/viewing-ssim";
import { frameProduct } from "../../src/core/product-framing";
import type { Instruction } from "../../src/core/types";
import { inside } from "../../src/core/geometry";

test.use({ trace: "off" });
const UPNG =
  (UPNGModule as unknown as { default: typeof UPNGModule }).default ??
  UPNGModule;

for (const index of [1, 2, 3, 5]) {
  const sample = photoCases[index];
  test(`Heart repair compatibility ${sample.name}`, async ({ page }, info) => {
    test.setTimeout(150000);
    const out = newEvidenceRoot(
      `output/current-heart-repair-validation/${info.project.name}/${sample.name}`,
    );
    mkdirSync(out, { recursive: true });
    await page.goto("/");
    await page
      .getByRole("button", {
        name: customerFlowText("uz", "heart"),
        exact: true,
      })
      .click();
    const source = await gallery(page, sample);
    const framing = JSON.parse(
      (await page.getByTestId("customer-photo").getAttribute("data-framing"))!,
    );
    const pair = "pair" in sample;
    expect(framing.version).toBe(
      pair ? "reviewed-product-framing/5" : "reviewed-heart-framing/7",
    );
    if (!pair) {
      const h = framing.framing.heads[0].target;
      expect(inside("heart", h.left + h.width / 2, h.top + 0.01)).toBe(true);
    }
    writeFileSync(join(out, "source.jpg"), source);
    writeFileSync(
      join(out, "prepared.png"),
      Buffer.from(await png(page, "customer-photo"), "base64"),
    );
    const start = Date.now();
    await page
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
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("iprasm.projects.v1") ?? "[]")
              .length,
        ),
      )
      .toBeGreaterThan(0);
    const guide = await validateInstruction(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("iprasm.projects.v1")!)[0]
            .instruction,
      ),
    );
    expect(guide.params.kitPreparation!.transform).toEqual(framing);
    expect(guide.metrics.lines).toBe(3000);
    const result = Buffer.from(
      await png(page, "customer-thread-result"),
      "base64",
    );
    writeFileSync(join(out, "result.png"), result);
    const decoded = UPNG.decode(Uint8Array.from(result).buffer),
      rgba = new Uint8Array(UPNG.toRGBA8(decoded)[0]);
    expect(
      Buffer.from(rgba.filter((_, k) => k % 4 !== 3)).equals(
        Buffer.from(
          Uint8Array.from(referenceRaster(guide, 1000), (v) =>
            Math.round(v * 255),
          ),
        ),
      ),
    ).toBe(true);
    writeFileSync(
      join(out, "result.json"),
      JSON.stringify(
        {
          sample: sample.name,
          elapsedMs,
          sequenceHash: guide.sequenceHash,
          preparation: guide.params.kitPreparation!.version,
          exactPhysicalRender: true,
          ownerLocalOnly: index === 3,
        },
        null,
        2,
      ),
    );
  });
}

for (const shape of ["heart"] as const) {
  test(`sample portrait: real ${shape} photo, adjustment and physical sequence render`, async ({
    page,
  }, info) => {
    test.setTimeout(150000);
    const out = newEvidenceRoot(
      `output/current-heart-repair-v2/${info.project.name}/${shape}`,
    );
    mkdirSync(out, { recursive: true });
    await page.goto("/");
    const flow = page.getByTestId("customer-flow");
    await expect(flow).toHaveAttribute("data-screen", "start");
    await page
      .getByRole("button", {
        name: customerFlowText("uz", shape),
        exact: true,
      })
      .click();
    await page.screenshot({ path: join(out, "start.png"), fullPage: true });
    const source = await gallery(page, photoCases[0]);
    writeFileSync(join(out, "source.jpg"), source);
    const workerFile = readdirSync("output/phase15-dist/assets").find(
      (n) => n.startsWith("photo-prepare.worker-") && n.endsWith(".js"),
    )!;
    // Inspect segmentation BEFORE framing, using the actual shipped local worker.
    const background = await page.evaluate(
      async ({ jpg, workerFile }) => {
        const bytes = Uint8Array.from(atob(jpg), (c) => c.charCodeAt(0));
        const bitmap = await createImageBitmap(
          new Blob([bytes], { type: "image/jpeg" }),
        );
        const c = document.createElement("canvas");
        c.width = bitmap.width;
        c.height = bitmap.height;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(bitmap, 0, 0);
        const worker = new Worker(`/assets/${workerFile}`);
        try {
          const mask = await new Promise<{
            width: number;
            height: number;
            values: Float32Array;
          }>((resolve, reject) => {
            const timeout = setTimeout(
              () => reject(Error("Mask analysis timeout")),
              60000,
            );
            worker.onmessage = (e) => {
              clearTimeout(timeout);
              e.data.error ? reject(Error(e.data.error)) : resolve(e.data.mask);
            };
            worker.onerror = (e) => {
              clearTimeout(timeout);
              reject(Error(e.message));
            };
            worker.postMessage({ id: 1, image: bitmap }, [bitmap]);
          });
          const m = document.createElement("canvas");
          m.width = mask.width;
          m.height = mask.height;
          const mc = m.getContext("2d")!,
            md = mc.createImageData(m.width, m.height);
          for (let k = 0; k < mask.values.length; k++) {
            const t = Math.max(0, Math.min(1, (mask.values[k] - 0.25) / 0.5));
            md.data.set(
              [255, 255, 255, Math.round(t * t * (3 - 2 * t) * 255)],
              k * 4,
            );
          }
          mc.putImageData(md, 0, 0);
          ctx.globalCompositeOperation = "destination-in";
          ctx.drawImage(m, 0, 0, c.width, c.height);
          ctx.globalCompositeOperation = "destination-over";
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, c.width, c.height);
          return c.toDataURL().split(",")[1];
        } finally {
          worker.terminate();
        }
      },
      { jpg: source.toString("base64"), workerFile },
    );
    writeFileSync(
      join(out, "source-white.png"),
      Buffer.from(background, "base64"),
    );
    const image = page.getByTestId("customer-photo"),
      baseline = await png(page, "customer-photo"),
      framing = await image.getAttribute("data-framing");
    await expect(
      flow.getByRole("checkbox", {
        name: customerFlowText("uz", "shoulders"),
        exact: true,
      }),
    ).not.toBeChecked();
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
    writeFileSync(join(out, "guide.json"), JSON.stringify(guide));
    writeFileSync(join(out, "framing.json"), framing!);
    const gray = (buf: Buffer) => {
      const d = UPNG.decode(Uint8Array.from(buf).buffer),
        rgba = new Uint8Array(UPNG.toRGBA8(d)[0]);
      return {
        pixels: Float32Array.from(
          { length: d.width * d.height },
          (_, k) => rgba[k * 4] / 255,
        ),
        size: d.width,
      };
    };
    const target = gray(Buffer.from(baseline, "base64"));
    const budgets = [];
    for (const budget of [2000, 2500, 3000]) {
      const raw = referenceRaster(guide, 1000, budget);
      const rgba = Uint8Array.from({ length: 1000 * 1000 * 4 }, (_, k) =>
        k % 4 === 3
          ? 255
          : Math.round(raw[Math.floor(k / 4) * 3 + (k % 4)] * 255),
      );
      writeFileSync(
        join(out, `result-${budget}.png`),
        Buffer.from(UPNG.encode([rgba.buffer], 1000, 1000, 0)),
      );
      const viewed = Float32Array.from(
        { length: 1000 * 1000 },
        (_, k) => raw[k * 3],
      );
      budgets.push({
        budget,
        score: viewingSsim(target.pixels, target.size, viewed, 1000, {
          faces: guide.params.kitPreparation!.transform.targetFaces,
        }),
      });
    }
    const oldDir = `output/phase15-photo-trial-dist/photo-test/desktop/${shape}`;
    const oldFraming = frameProduct(
      "people",
      guide.params.kitPreparation!.transform.faces,
      shape,
      guide.params.kitPreparation!.sourceAspect,
    );
    const oldTarget = gray(readFileSync(join(oldDir, "prepared.png"))),
      oldRender = gray(readFileSync(join(oldDir, "result.png")));
    const old = viewingSsim(
      oldTarget.pixels,
      oldTarget.size,
      oldRender.pixels,
      oldRender.size,
      { faces: oldFraming.targetFaces },
    );
    writeFileSync(
      join(out, "scores.json"),
      JSON.stringify({ old, budgets }, null, 2),
    );
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
