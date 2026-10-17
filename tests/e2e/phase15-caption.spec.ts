import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { photoCases, gallery, english, png } from "./phase12-cases";
import { validateInstruction } from "../../src/core/validation";
import { hash, sequencePayload } from "../../src/core/engine";
import { unlockKitGuide } from "./kit-access";
import UPNGModule from "@pdf-lib/upng";
const UPNG =
  (UPNGModule as unknown as { default: typeof UPNGModule }).default ??
  UPNGModule;
test.use({ serviceWorkers: "block" });
for (const [shape, text] of [
  ["circle", "Ali 2026"],
  ["rectangle", "Али 2026"],
  ["heart", "علي ٢٠٢٦"],
] as const)
  test(`portrait caption ${shape} keeps target pixels and one paid immutable sequence`, async ({
    page,
  }, info) => {
    test.setTimeout(180000);
    test.skip(
      !existsSync(photoCases[0].source),
      "Local synthetic portrait stays outside Git",
    );
    await page.goto("/");
    await english(page);
    if (shape !== "circle")
      await page
        .getByRole("button", {
          name: shape === "heart" ? "Heart" : "Square",
          exact: true,
        })
        .click();
    await gallery(page, photoCases[0]);
    const before = await png(page, "customer-photo");
    await page.getByTestId("portrait-caption").fill(text);
    await expect
      .poll(() =>
        page.getByTestId("customer-photo").getAttribute("data-framing"),
      )
      .toContain('"portrait-caption/2"');
    await expect.poll(() => png(page, "customer-photo")).not.toBe(before);
    await expect(
      page.getByRole("button", { name: "Create", exact: true }),
    ).toBeEnabled();
    const target = await png(page, "customer-photo");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByTestId("customer-result")).toBeVisible({
      timeout: 60000,
    });
    const guide = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("iprasm.projects.v1")!)[0].instruction,
    );
    await validateInstruction(guide);
    expect(guide.params.kitPreparation.version).toBe("standard-preparation/6");
    expect(guide.params.kitPreparation.transform.caption.text).toBe(text);
    expect(guide.algorithm).toBe("classic-greedy/3");
    expect(guide.metrics.lines).toBe(3000);
    const raw = UPNG.decode(
        Uint8Array.from(Buffer.from(target, "base64")).buffer,
      ),
      rgba = new Uint8Array(UPNG.toRGBA8(raw)[0]);
    expect(guide.imageHash).toBe(
      await hash(rgba.filter((_, j) => j % 4 !== 3)),
    );
    const tampered = structuredClone(guide);
    tampered.params.kitPreparation.transform.caption.portraitScale = 0.99;
    tampered.sequenceHash = await hash(sequencePayload(tampered));
    await expect(validateInstruction(tampered)).rejects.toThrow();
    const out = `output/phase15/caption-v2/${info.project.name}/${shape}`;
    mkdirSync(out, { recursive: true });
    writeFileSync(out + "/target.png", Buffer.from(target, "base64"));
    writeFileSync(out + "/guide.json", JSON.stringify(guide));
    writeFileSync(
      out + "/result.png",
      Buffer.from(await png(page, "customer-thread-result"), "base64"),
    );
    await page
      .getByRole("button", { name: "Adjust again", exact: true })
      .click();
    await expect(page.getByTestId("portrait-caption")).toHaveValue(text);
    await expect.poll(() => png(page, "customer-photo")).toBe(target);
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByTestId("customer-result")).toBeVisible({
      timeout: 60000,
    });
    await page
      .getByRole("button", { name: "Start assembling", exact: true })
      .click();
    await unlockKitGuide(page);
    await expect(page.getByTestId("player-hash")).toHaveText(
      guide.sequenceHash,
    );
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Project JSON", exact: true })
      .last()
      .click();
    await (await pending).saveAs(out + "/export.json");
    await page.screenshot({ path: out + "/assembly.png", fullPage: true });
  });
