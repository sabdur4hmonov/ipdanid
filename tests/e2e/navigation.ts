import type { Page, Locator } from "@playwright/test";

export async function openMore(page: Page) {
  const menu = page.locator("details.more-menu");
  if (!(await menu.evaluate((node) => (node as HTMLDetailsElement).open)))
    await menu.locator("summary").click();
}

// Open the actual disclosures through their summaries, outside-in. Assertions
// still require visible controls; hidden product sections are never bypassed.
export async function revealControl(control: Locator) {
  const ancestors = control.locator("xpath=ancestor::details");
  for (let index = 0; index < await ancestors.count(); index++) {
    const details = ancestors.nth(index);
    if (!(await details.evaluate((node) => (node as HTMLDetailsElement).open)))
      await details.locator(":scope > summary").click();
  }
}
