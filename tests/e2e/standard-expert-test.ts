import { test as base } from "@playwright/test";
export * from "@playwright/test";
export async function enterStandardExpert(
  page: import("@playwright/test").Page,
) {
  const menu = page.getByTestId("customer-menu");
  if (await menu.isVisible()) {
    await menu.locator("summary").click();
    await page.getByTestId("enter-expert").click();
  }
}
export const test = base.extend({
  page: async ({ page }, use) => {
    const go = page.goto.bind(page),
      reload = page.reload.bind(page);
    page.goto = async (...args) => {
      const r = await go(...args);
      await page.locator(".app").waitFor();
      await enterStandardExpert(page);
      return r;
    };
    page.reload = async (...args) => {
      const r = await reload(...args);
      await page.locator(".app").waitFor();
      await enterStandardExpert(page);
      return r;
    };
    await use(page);
  },
});
