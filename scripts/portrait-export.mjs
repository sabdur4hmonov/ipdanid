import { chromium } from "@playwright/test";
import { writeFileSync, existsSync } from "node:fs";
const prefix = process.argv[2] ?? "continued",
  folder = process.argv[3] ?? "portrait",
  browser = await chromium.launch({ headless: true });
if (
  folder === "guarded" &&
  existsSync(`output/${folder}/${prefix}-guide.json`)
) {
  await browser.close();
  throw new Error("Preserve completed immutable guide export");
}
try {
  const page = await browser.newPage();
  await page.route("**/@vite/client", (route) => route.abort());
  await page.goto("http://127.0.0.1:5173");
  const data = await page.evaluate(
    async ({ prefix, folder }) => {
      const { validateInstruction, progressFor, projectFile, toTxt } =
          await import("/src/core/validation.ts"),
        { exportPdf } = await import("/src/core/pdf.ts"),
        { renderInstruction } = await import("/src/core/render.ts");
      const instruction = await validateInstruction(
        (await (await fetch(`/output/${folder}/${prefix}.json`)).json())
          .instruction,
      );
      const source = (
        await (await fetch("/output/portrait/browser-guide.json")).json()
      ).project;
      const project = {
        ...source,
        id: crypto.randomUUID(),
        name:
          folder === "guarded"
            ? `Guarded distribution — ${prefix} (quality unaccepted)`
            : folder === "regions"
              ? `Corrected regions — ${prefix} (quality unaccepted)`
              : folder === "background"
                ? `Background experiment — ${prefix} (quality unaccepted)`
                : instruction.algorithm === "density-optical/5"
                  ? "Global contour portrait variant"
                  : `Portrait refinement stage ${instruction.params.refinementStage ?? 1}`,
        instruction,
        progress: progressFor(instruction),
      };
      const c = document.createElement("canvas");
      c.width = 1024;
      c.height = Math.round(
        (1024 * instruction.profile.heightMm) / instruction.profile.widthMm,
      );
      renderInstruction(c.getContext("2d"), instruction);
      return {
        project: projectFile(project),
        txt: toTxt(instruction),
        png: c.toDataURL(),
        pdf: [...(await exportPdf(instruction, "en", { confirmed: 0 }))],
      };
    },
    { prefix, folder },
  );
  writeFileSync(
    `output/${folder}/${prefix}-guide.json`,
    JSON.stringify(data.project, null, 2),
  );
  writeFileSync(`output/${folder}/${prefix}-guide.txt`, data.txt);
  writeFileSync(
    `output/${folder}/${prefix}-guide.png`,
    Buffer.from(data.png.split(",")[1], "base64"),
  );
  writeFileSync(`output/${folder}/${prefix}-guide.pdf`, Buffer.from(data.pdf));
  console.log(
    JSON.stringify({
      prefix,
      hash: data.project.project.instruction.sequenceHash,
      confirmed: data.project.project.progress.confirmed,
    }),
  );
} finally {
  await browser.close();
}
