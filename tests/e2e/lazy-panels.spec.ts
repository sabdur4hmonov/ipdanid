import { test, expect } from "@playwright/test";
import { gallery, photoCases, english } from "./phase12-cases";
test.use({trace:"off"});
test("opening the lazy Shop preserves the customer's exact photo placement",async({page})=>{
  test.setTimeout(120000);
  await page.goto("/");await english(page);await gallery(page,photoCases[0]);
  const zoom=page.getByRole("slider",{name:"Zoom",exact:true});
  await zoom.focus();await zoom.press("ArrowRight");await zoom.press("ArrowRight");
  await page.getByRole("button",{name:"Rotate ↻",exact:true}).click();
  const framing=await page.getByTestId("customer-photo").getAttribute("data-framing");
  await page.getByTestId("customer-menu").locator("summary").click();
  await page.getByTestId("customer-shop").click();
  await expect(page.locator(".customer-hub")).toBeVisible();
  await expect(page.locator(".customer-tabs").getByRole("button",{name:"Shop",exact:true})).toHaveAttribute("aria-pressed","true");
  await page.getByRole("navigation",{name:"Main sections",exact:true}).getByRole("button",{name:"Create",exact:true}).click();
  await expect(page.getByTestId("customer-flow")).toHaveAttribute("data-screen","adjust");
  await expect(page.getByTestId("customer-photo")).toHaveAttribute("data-framing",framing!);
  await expect(page.getByTestId("customer-flow").getByRole("button",{name:"Create",exact:true})).toBeEnabled();
});
