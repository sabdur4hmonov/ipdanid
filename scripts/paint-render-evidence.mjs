// Private comparison of unchanged, owner-supplied guides. No photo upload.
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
// Regenerate the private baseline from the preserved checkpoint, never HEAD.
mkdirSync("tmp", { recursive: true });
writeFileSync(
  "tmp/render-before.ts",
  execFileSync("git", [
    "show",
    "a1c03242aec3de7633aa263840cd8b606dd7d683:src/core/render.ts",
  ], { encoding: "utf8" }).replaceAll('from "./', 'from "/src/core/'),
);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5183/");
  mkdirSync("output/paint", { recursive: true });
  const report = [];
  for (const [name, path] of [
    ["anatomy", "output/anatomy/nose-lip-guide.json"],
    ["basis", "output/pin-basis/basis-320-guide.json"],
  ]) {
    const instruction = JSON.parse(readFileSync(path, "utf8")).project
      .instruction;
    const result = await page.evaluate(async (i) => {
      const before = await import("/tmp/render-before.ts"),
        after = await import("/src/core/render.ts");
      const canvas = () => {
        const c = document.createElement("canvas");
        c.width = 720;
        c.height = Math.round((720 * i.profile.heightMm) / i.profile.widthMm);
        return c;
      };
      const old = canvas(),
        next = canvas();
      before.renderInstruction(old.getContext("2d"), i);
      after.renderInstruction(next.getContext("2d"), i);
      const a = old
          .getContext("2d")
          .getImageData(0, 0, old.width, old.height).data,
        b = next
          .getContext("2d")
          .getImageData(0, 0, next.width, next.height).data;
      let differences = 0;
      for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) differences++;
      return {
        before: old.toDataURL(),
        after: next.toDataURL(),
        rgbaDifferences: differences,
      };
    }, instruction);
    for (const key of ["before", "after"])
      writeFileSync(
        `output/paint/${name}-${key}.png`,
        Buffer.from(result[key].split(",")[1], "base64"),
      );
    report.push({
      name,
      algorithm: instruction.algorithm,
      sequenceHash: instruction.sequenceHash,
      connections: instruction.metrics.lines,
      rgbaDifferences: result.rgbaDifferences,
      generatorChanged: false,
      physicalAcceptance: false,
      likenessAcceptance: "open",
    });
  }
  writeFileSync(
    "output/paint/render-comparison.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
