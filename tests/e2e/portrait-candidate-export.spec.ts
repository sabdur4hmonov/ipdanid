import { test, expect } from "./legacy-test";
import { readFileSync } from "node:fs";
test("real new portrait guide keeps player, zero progress and all exports on the same immutable sequence", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const file = JSON.parse(
      readFileSync("output/portrait-dispatch/resolved240.json", "utf8"),
    ),
    i = file.project.instruction;
  await page.goto("/");
  await page.getByLabel("Language").selectOption("en");
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page
    .locator('input[accept=".json,.txt"]')
    .setInputFiles("output/portrait-dispatch/resolved240.json");
  await expect(page.getByTestId("player-hash")).toHaveText(i.sequenceHash);
  await expect(page.getByTestId("confirmed-step")).toContainText(
    `0/${i.metrics.lines}`,
  );
  for (const [button, name] of [
    ["Project JSON", "ui-export.json"],
    ["TXT sequence", "ui-export.txt"],
    ["Preview PNG", "ui-preview.png"],
    ["PDF guide", "ui-guide.pdf"],
  ]) {
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: button, exact: true })
      .last()
      .click();
    const download = await pending;
    const path = (await download.path())!;
    if (name.endsWith(".json")) {
      const p = JSON.parse(readFileSync(path, "utf8"));
      expect(p.project.instruction).toEqual(i);
      expect(p.project.progress.confirmed).toBe(0);
    }
    if (name.endsWith(".txt"))
      expect(JSON.parse(readFileSync(path, "utf8").split("\n")[1])).toEqual(i);
    await download.saveAs(
      `output/portrait-dispatch/${info.project.name}-${name}`,
    );
  }
  await page.screenshot({
    path: `output/portrait-dispatch/player-${info.project.name}.png`,
    fullPage: true,
  });
});
