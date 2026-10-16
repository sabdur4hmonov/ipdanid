import { enterStandardExpert } from "./standard-expert-test";
import { test as base } from "@playwright/test";
export * from "@playwright/test";
// Historical regressions explicitly select Menu → Expert → Custom.
// Standard-kit tests retained expert controls; phase12-customer tests the ordinary default.
export const test = base.extend({
  page: async ({ page }, use) => {
    async function selectPreviousTools() {
      if (new URL(page.url()).pathname !== "/") return;
      await page.locator(".app").waitFor();
      await enterStandardExpert(page);
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
