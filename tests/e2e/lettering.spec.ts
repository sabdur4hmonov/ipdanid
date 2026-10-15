import { test, expect } from "./legacy-test";
import { readFileSync } from "node:fs";
import { openMore, revealControl } from "./navigation";
import { unlockKitGuide } from "./kit-access";
import {
  PDFDocument,
  PDFName,
  PDFRawStream,
  decodePDFRawStream,
  PDFArray,
} from "pdf-lib";
import { rasterSequence } from "../../src/core/optical";
import { validateInstruction } from "../../src/core/validation";
for (const style of ["outline", "target"] as const)
  test(`real Arabic ${style} preparation, review, guide, player and exact offline exports`, async ({
    page,
    context,
  }, info) => {
    test.setTimeout(180000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await page.getByLabel("Language", { exact: true }).selectOption("en");
    await openMore(page);
    await page
      .getByRole("button", { name: "Grid crafts", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Thread lettering", exact: true })
      .click();
    const studio = page.getByTestId("text-studio");
    await page.getByTestId("lettering-text").fill("سلام");
    await page.getByTestId("lettering-style").selectOption(style);
    await revealControl(studio.getByLabel("Number of pins", { exact: true }));
    await studio
      .getByLabel("Number of pins", { exact: true })
      .fill(style === "outline" ? "120" : "24");
    if (style === "target")
      await studio.getByLabel("Maximum connections", { exact: true }).fill("120");
    else
      await expect(
        studio.getByLabel("Maximum connections", { exact: true }),
      ).toHaveCount(0);
    await studio
      .getByRole("combobox", { name: "Computation resolution", exact: true })
      .selectOption("64");
    await studio
      .getByRole("button", { name: "Prepare text", exact: true })
      .click();
    await expect(page.getByTestId("lettering-review")).toBeVisible();
    await expect(
      studio.getByRole("button", {
        name: "Calculate thread guide",
        exact: true,
      }),
    ).toBeDisabled();
    await page.getByTestId("lettering-review").check();
    // Same text changed requires a new prepared target and explicit review.
    await page.getByTestId("lettering-text").fill("سَلام");
    await expect(page.getByTestId("lettering-review")).toHaveCount(0);
    await page.getByTestId("lettering-text").fill("سلام");
    await expect(page.getByTestId("lettering-review")).not.toBeChecked();
    await page.getByTestId("lettering-review").check();
    await studio
      .getByRole("button", { name: "Calculate thread guide", exact: true })
      .click();
    await expect(page.getByTestId("lettering-result")).toBeVisible({
      timeout: 120000,
    });
    await page.screenshot({
      path: info.outputPath(`arabic-${style}.png`),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Save and assemble", exact: true })
      .click();
    await unlockKitGuide(page);
    await expect(page.getByTestId("confirmed-step")).toContainText("0/");
    const sequenceHash = await page.getByTestId("player-hash").textContent();
    let i: any;
    for (const button of ["Project JSON", "TXT sequence", "PDF guide"]) {
      const pending = page.waitForEvent("download");
      await page
        .getByRole("button", { name: button, exact: true })
        .last()
        .click();
      const d = await pending,
        p = (await d.path())!;
      if (button === "Project JSON") {
        i = JSON.parse(readFileSync(p, "utf8")).project.instruction;
        await validateInstruction(i);
        expect(i.sequenceHash).toBe(sequenceHash);
        expect(i.algorithm).toBe(
          style === "outline" ? "glyph-outline/19" : "density-subject/18",
        );
        expect(i.params.product.text).toBe("سلام");
        expect(i.params.product.direction).toBe("rtl");
      } else if (button === "TXT sequence")
        expect(JSON.parse(readFileSync(p, "utf8").split("\n")[1])).toEqual(i);
      else {
        const pdf = await PDFDocument.load(readFileSync(p)),
          images = pdf
            .getPage(0)
            .node.Resources()!
            .lookup(PDFName.of("XObject")) as any,
          previews = images
            .entries()
            .map((e: any) => pdf.context.lookup(e[1]))
            .filter(
              (s: any) =>
                s instanceof PDFRawStream &&
                s.dict.get(PDFName.of("Subtype"))?.toString() === "/Image",
            );
        expect(previews).toHaveLength(1);
        expect(Buffer.from(decodePDFRawStream(previews[0]).decode())).toEqual(
          Buffer.from(
            Uint8Array.from(rasterSequence(i), (v) => Math.round(v * 255)),
          ),
        );
        expect(pdf.getPageCount()).toBeGreaterThan(3);
        // Independently check every 1:1 tiled physical nail centre, including overlap copies.
        const MM = 72 / 25.4,
          pw = 210 * MM,
          ph = 297 * MM,
          margin = 18 * MM,
          tileW = (pw - 2 * margin) / MM,
          tileH = (ph - 2 * margin - 40) / MM,
          strideX = tileW - 10,
          strideY = tileH - 10,
          cols = Math.ceil((i.profile.widthMm - 10) / strideX),
          rows = Math.ceil((i.profile.heightMm - 10) / strideY);
        for (let row = 0; row < rows; row++)
          for (let col = 0; col < cols; col++) {
            const page = pdf.getPage(1 + row * cols + col),
              contents = page.node.Contents(),
              streams =
                contents instanceof PDFArray
                  ? contents.asArray().map((v) => pdf.context.lookup(v))
                  : [contents],
              code = streams
                .map((s) =>
                  Buffer.from(
                    decodePDFRawStream(s as PDFRawStream).decode(),
                  ).toString(),
                )
                .join("\n"),
              found = [
                ...code.matchAll(
                  /([-\d.e]+) ([-\d.e]+) m\n[^\n]+ c\n[^\n]+ c\n[^\n]+ c\n[^\n]+ c\nQ\nS/g,
                ),
              ].map((v) => [Number(v[1]), Number(v[2])]),
              expected = i.profile.pins
                .filter((p: any) => {
                  const x = p.x * i.profile.widthMm - col * strideX,
                    y = p.y * i.profile.heightMm - row * strideY;
                  return x >= 0 && x <= tileW && y >= 0 && y <= tileH;
                })
                .map((p: any) => [
                  margin +
                    (p.x * i.profile.widthMm - col * strideX) * MM -
                    (i.profile.shaftMm / 2) * MM,
                  ph -
                    margin -
                    35 -
                    (p.y * i.profile.heightMm - row * strideY) * MM,
                ]);
            expect(found).toHaveLength(expected.length);
            for (let k = 0; k < found.length; k++) {
              expect(found[k][0]).toBeCloseTo(expected[k][0], 6);
              expect(found[k][1]).toBeCloseTo(expected[k][1], 6);
            }
          }
      }
      await d.saveAs(info.outputPath(button.replaceAll(" ", "-")));
    }
    await page.evaluate(async () => navigator.serviceWorker.ready);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByTestId("player-hash")).toHaveCount(0);
    await page
      .getByRole("button", { name: "My projects", exact: true })
      .click();
    await page.getByRole("button", { name: "Resume", exact: true }).click();
    await expect(page.getByTestId("player-hash")).toHaveText(sequenceHash!);
    await openMore(page);
    await page
      .getByRole("button", { name: "Grid crafts", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Thread lettering", exact: true })
      .click();
    await page.getByTestId("lettering-text").fill("سلام");
    await page
      .getByRole("button", { name: "Prepare text", exact: true })
      .click();
    await expect(page.getByTestId("lettering-review")).toBeVisible();
    expect(errors).toEqual([]);
  });
