import { galleryText } from "../../src/gallery-i18n";
import { test,expect } from "@playwright/test";
import { english,choosePhoto,result } from "../protected-e2e/helpers";
import { businessText } from "../../src/business-i18n";

test("core-only production policy preserves photo preview/player and Admin contact editing",async({page},info)=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/");await english(page);
  await page.getByTestId("customer-menu").locator("summary").click();await expect(page.getByTestId("enter-expert")).toHaveCount(0);await page.getByTestId("customer-menu").locator("summary").click();
  await page.getByTestId("customer-account-link").click();const hub=page.locator(".customer-hub");
  await hub.getByRole("button",{name:"Administration",exact:true}).click();
  await hub.getByLabel("Administrator token",{exact:true}).fill(process.env.LOCAL_ADMIN_TOKEN!);
  await hub.getByRole("button",{name:"Open administration",exact:true}).click();
  const settings=page.getByTestId("business-admin");await expect(settings).toBeVisible();
  await expect(page.locator("#admin-gallery")).toHaveCount(0);await expect(page.locator("#admin-partners")).toHaveCount(0);await expect(page.locator("#admin-commissions")).toHaveCount(0);await expect(page.locator("#admin-analytics")).toHaveCount(0);
  await settings.getByLabel(businessText("en","sellerTelegram"),{exact:true}).fill("p1_browser_owner");await settings.getByLabel(businessText("en","sellerPhone"),{exact:true}).fill("+998901234567");
  await settings.locator("#admin-delivery").getByRole("button",{name:businessText("en","save"),exact:true}).click();
  await expect(page.getByTestId("customer-contact")).toHaveAttribute("href",/t\.me\/p1_browser_owner\?/);
  await page.reload();await english(page);await choosePhoto(page,true);
  await page.locator("button.customer-main-action").click();await result(page);
  await page.getByTestId("customer-result").getByRole("button",{name:"Start assembling",exact:true}).click();
  const gate=page.getByTestId("build-gate");await expect(gate).toBeVisible();await expect(gate.getByRole("link",{name:/Telegram/})).toHaveAttribute("href",/p1_browser_owner/);
  const issued=await page.request.post(process.env.IP_RASM_TEST_API_URL+"/api/admin/kits/batch",{headers:{authorization:"Bearer "+process.env.LOCAL_ADMIN_TOKEN},data:{profile:"standard-base-r1",count:1,requestKey:crypto.randomUUID()}});expect(issued.ok()).toBe(true);const batch=await issued.json();
  await page.getByTestId("have-kit-code").click();await page.getByTestId("kit-code").fill(batch.codes[0].code);await gate.getByRole("button",{name:"Sign in with kit code",exact:true}).click();await page.getByTestId("unlock-build").click();await expect(page.getByTestId("player-hash")).toBeVisible();expect(errors).toEqual([]);
  await page.screenshot({path:`output/p1/core-${info.project.name}.png`});
});
test("enabled optional features are reachable and only the selected craft is shown",async({page},info)=>{
  await page.goto("/");await english(page);await page.getByTestId("customer-menu").locator("summary").click();await expect(page.getByTestId("enter-expert")).toBeVisible();await page.getByTestId("customer-menu").locator("summary").click();
  await page.getByTestId("customer-account-link").click();const hub=page.locator(".customer-hub");await expect(hub.getByRole("button",{name:galleryText("en","title"),exact:true})).toBeVisible();
  await page.locator(".header-right .more-menu summary").click();await page.locator(".header-right .more-menu").getByRole("button",{name:/craft/i}).click();
  await expect(page.locator("select").filter({has:page.locator('option[value="diamond"]')})).toBeVisible();await expect(page.locator('option[value="mosaic"]')).toHaveCount(0);
  await page.screenshot({path:`output/p1/enabled-${info.project.name}.png`});
});
