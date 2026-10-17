import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { gallery, english, png, photoCases } from "./phase12-cases";
import { validateInstruction } from "../../src/core/validation";
import { referenceRaster } from "../../src/core/classic-reference";
import { viewingSsim } from "../helpers/viewing-ssim";
import UPNGModule from "@pdf-lib/upng";
const UPNG =
  (UPNGModule as unknown as { default: typeof UPNGModule }).default ??
  UPNGModule;
import { isSquareInteriorAxis } from "../../src/core/classic-least-squares";
const cases = [
  {
    name: "owner-square",
    source: "output/portrait-dispatch/target-320.png",
    shape: "rectangle",
  },
  ...photoCases,
  { name: "one-heart", source: photoCases[0].source, shape: "heart" },
  ...(["animal", "vehicle", "object"] as const).flatMap((kind) =>
    (["circle", "rectangle", "heart"] as const).map((shape) => ({
      name: kind + "-" + shape,
      kind,
      shape,
    })),
  ),
  ...["SALOM", "САЛОМ", "سلام"].flatMap((text,j)=>(["circle","rectangle","heart"] as const).map(shape=>({name:"lettering-"+j+"-"+shape,kind:"lettering" as const,shape,text}))),
];
for (const c of cases)
  test("product14 " + c.name, async ({ page }, info) => {
    test.setTimeout(180000);
    await page.goto("/");
    await english(page);
    const kind = "kind" in c ? c.kind : "people";
    if (kind !== "people") {
      await page.getByTestId("customer-menu").locator("summary").click();
      await page.getByTestId("product-kind").selectOption(kind);
      await page.getByTestId("customer-menu").locator("summary").click();
    }
    if (c.shape !== "circle")
      await page
        .getByRole("button", {
          name: c.shape === "heart" ? "Heart" : "Square",
          exact: true,
        })
        .click();
    if (kind === "lettering") {
      await page
        .getByTestId("lettering-input")
        .fill(("text" in c ? c.text : "SALOM") as string);
      await page.getByTestId("prepare-lettering").click();
    } else if (kind === "people") {
      await gallery(page, c as (typeof photoCases)[number]);
    } else {
      const raw = await page.evaluate((kind) => {
        const c = document.createElement("canvas");
        c.width = 700;
        c.height = 500;
        const x = c.getContext("2d")!;
        x.fillStyle = "#f3f3f3";
        x.fillRect(0, 0, 700, 500);
        x.fillStyle = "#313b4a";
        if (kind === "vehicle") {
          x.fillRect(140, 220, 420, 100);
          x.beginPath();
          x.moveTo(230, 220);
          x.lineTo(290, 140);
          x.lineTo(440, 140);
          x.lineTo(500, 220);
          x.fill();
          for (const p of [230, 470]) {
            x.beginPath();
            x.arc(p, 330, 40, 0, Math.PI * 2);
            x.fill();
          }
        } else if (kind === "animal") {
          x.beginPath();
          x.ellipse(350, 260, 150, 140, 0, 0, 7);
          x.fill();
          x.beginPath();
          x.moveTo(200, 240);
          x.lineTo(210, 70);
          x.lineTo(300, 140);
          x.moveTo(400, 140);
          x.lineTo(490, 70);
          x.lineTo(500, 240);
          x.fill();
          x.fillStyle = "#fff";
          for (const p of [290, 410]) {
            x.beginPath();
            x.arc(p, 230, 20, 0, 7);
            x.fill();
          }
          x.fillRect(330, 290, 40, 20);
        } else {
          x.fillRect(230, 120, 200, 240);
          x.lineWidth = 25;
          x.strokeStyle = "#313b4a";
          x.beginPath();
          x.arc(430, 220, 70, -Math.PI / 2, Math.PI / 2);
          x.stroke();
        }
        return c.toDataURL().split(",")[1];
      }, kind);
      const chooser = page.waitForEvent("filechooser");
      await page
        .getByRole("button", { name: "Choose photo", exact: true })
        .click();
      await (
        await chooser
      ).setFiles({
        name: c.name + ".png",
        mimeType: "image/png",
        buffer: Buffer.from(raw, "base64"),
      });
    }
    await expect(page.getByTestId("customer-photo")).not.toHaveAttribute(
      "data-framing",
      "null",
      { timeout: 90000 },
    );
    const out = "output/phase14/" + info.project.name + "/" + c.name;
    mkdirSync(out, { recursive: true });
    writeFileSync(
      out + "/target.png",
      Buffer.from(await png(page, "customer-photo"), "base64"),
    );
    if (kind === "people") {
      const proof = JSON.parse(
        (await page
          .getByTestId("customer-photo")
          .getAttribute("data-framing"))!,
      );
      const bottom = Math.max(
        ...proof.framing.heads.map((h: { chin: number }) => h.chin),
      );
      expect(
        await page
          .getByTestId("customer-photo")
          .evaluate((canvas: HTMLCanvasElement, chin: number) => {
            const d = canvas
              .getContext("2d")!
              .getImageData(0, 0, 500, 500).data;
            for (let y = Math.min(500, Math.ceil(chin * 500)); y < 500; y++)
              for (let x = 0; x < 500; x++)
                if (d[(y * 500 + x) * 4] !== 255) return false;
            return true;
          }, bottom),
      ).toBe(true);
    }
    const start = Date.now();
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByTestId("customer-result")).toBeVisible({
      timeout: 60000,
    });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(15000);
    writeFileSync(
      out + "/result.png",
      Buffer.from(await png(page, "customer-thread-result"), "base64"),
    );
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("iprasm.projects.v1") || "[]")
              .length,
        ),
      )
      .toBeGreaterThan(0);
    const i = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("iprasm.projects.v1")!)[0].instruction,
    );
    await validateInstruction(i);
    expect(i.algorithm).toBe("classic-greedy/3");
    expect(i.profile.standardKit.chordPolicy).toBe("axis-interior-skip/2");
    expect(i.metrics.lines).toBe(3000);
    const path = i.segments[0].path;
    if (c.shape === "rectangle")
      for (let j = 1; j < path.length; j++)
        expect(isSquareInteriorAxis(i.profile, path[j - 1], path[j])).toBe(
          false,
        );
    writeFileSync(out + "/guide.json", JSON.stringify(i));
    const raw = UPNG.decode(
        Uint8Array.from(readFileSync(out + "/target.png")).buffer,
      ),
      rgba = new Uint8Array(UPNG.toRGBA8(raw)[0]);
    const target = Float32Array.from(
        { length: 500 * 500 },
        (_, k) => rgba[k * 4] / 255,
      ),
      raster = referenceRaster(i, 1000),
      image = Float32Array.from(
        { length: 1000 * 1000 },
        (_, k) => raster[k * 3],
      );
    const ssim = viewingSsim(target, 500, image, 1000, {
      faces: i.params.kitPreparation.transform.targetFaces,
    });
    writeFileSync(
      out + "/metrics.json",
      JSON.stringify({ case: c.name, kind, shape: c.shape, elapsed, ssim }),
    );
    await page.screenshot({ path: out + "/screen.png", fullPage: true });
  });
