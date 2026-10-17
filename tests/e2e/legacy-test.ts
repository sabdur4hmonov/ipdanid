import { enterStandardExpert } from "./standard-expert-test";
import { test as base, type Page } from "@playwright/test";
export * from "@playwright/test";
// Every tab in a historical-test context explicitly selects the legacy UI.
// New customer/assembly tests import Playwright directly and keep auto-resume.
const configured = new WeakSet<Page>();
function configure(page: Page) {
  if (configured.has(page)) return;
  configured.add(page);
  const select = async () => {
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
  };
  const go = page.goto.bind(page),
    reload = page.reload.bind(page);
  page.goto = async (...args) => {
    const result = await go(...args);
    await select();
    return result;
  };
  page.reload = async (...args) => {
    const result = await reload(...args);
    await select();
    return result;
  };
}
export const test = base.extend({
  context: async ({ context }, use) => {
    const create = context.newPage.bind(context);
    context.newPage = async () => {
      const page = await create();
      configure(page);
      return page;
    };
    await use(context);
  },
  page: async ({ page }, use) => {
    configure(page);
    await use(page);
  },
});
