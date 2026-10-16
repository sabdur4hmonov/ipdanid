import { test as base } from "@playwright/test";
export * from "@playwright/test";
// Existing product regression deliberately selects the visible Custom/previous
// tools entry. Standard-kit.spec tests the actual new default without this fixture.
export const test = base.extend({
  page: async ({ page }, use) => {
    async function selectPreviousTools() {
      if (new URL(page.url()).pathname !== "/") return;
      await page.locator(".app").waitFor();
      const mode = page.getByTestId("create-mode");
      if ((await mode.count()) && !(await mode.isVisible()))
        await page.getByTestId("expert-tools").locator("summary").click();
      if (
        (await mode.isVisible()) &&
        /Custom|Maxsus|Махсус|Другие/.test(await mode.innerText())
      )
        await mode.click();
    }
    const goto = page.goto.bind(page),
      reload = page.reload.bind(page);
    page.goto = async (...args) => {
      const response = await goto(...args);
      await selectPreviousTools();
      return response;
    };
    page.reload = async (...args) => {
      const response = await reload(...args);
      await selectPreviousTools();
      return response;
    };
    await use(page);
  },
});
