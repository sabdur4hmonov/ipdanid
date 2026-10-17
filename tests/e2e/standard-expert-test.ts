// Historical standard controls require Menu → Expert; the new customer flow has separate acceptance tests.
import { test as base } from "@playwright/test";
export * from "@playwright/test";
export async function enterStandardExpert(
  page: import("@playwright/test").Page,
) {
  const menu = page.getByTestId("customer-menu");
  if (await menu.isVisible()) {
    if (!(await menu.evaluate((e) => (e as HTMLDetailsElement).open)))
      await menu.locator("summary").click();
    await page.getByTestId("enter-expert").click();
  } else {
    // Phase14 resumes assembly after a reload. The visible app menu provides
    // the same explicit Expert action; hidden creator controls are not bypassed.
    const appMenu = page.locator("details.more-menu");
    if (await appMenu.isVisible()) {
      if (!(await appMenu.evaluate((e) => (e as HTMLDetailsElement).open)))
        await appMenu.locator("summary").click();
      await appMenu
        .getByRole("button", {
          name: /^(Expert mode|Mutaxassis rejimi|Мутахассис режими|Режим эксперта)$/,
        })
        .click();
    }
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
