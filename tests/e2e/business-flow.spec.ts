import { test,expect } from "@playwright/test";
let originalSettings: any;
let announcementTitle: string | undefined;
test.afterEach(async ({ request }) => {
  const headers = { Authorization: `Bearer ${process.env.LOCAL_ADMIN_TOKEN!}` };
  if (announcementTitle) {
    const items = await (await request.get("/api/admin/announcements", { headers })).json();
    for (const item of items.filter((row: any) => row.title === announcementTitle && row.active))
      expect((await request.post(`/api/admin/announcements/${item.id}/revoke`, { headers, data: { revision: item.revision } })).ok()).toBe(true);
  }
  if (originalSettings) {
    const current = await (await request.get("/api/admin/settings", { headers })).json();
    expect((await request.post("/api/admin/settings", { headers, data: { ...originalSettings, revision: current.revision } })).ok()).toBe(true);
  }
  announcementTitle = undefined;
  originalSettings = undefined;
});
test.use({trace:"off"});
test("isolated storefront pickup retries a lost response after reload without duplicate orders; owner messages and settings really persist",async({page,request},info)=>{
 test.skip(process.env.IP_RASM_BUSINESS_TEST!=="isolated","Only mutate the explicitly isolated sandbox test database");
 const token=process.env.LOCAL_ADMIN_TOKEN!;
 const headers={Authorization:`Bearer ${token}`};
 let config=await(await request.get("/api/admin/settings",{headers})).json();
 originalSettings = { ...config };
 config=await(await request.post("/api/admin/settings",{headers,data:{...config,pickupAddress:"Test pickup A",sellerName:"Test seller A",paymentDetails:"Test terms A",deliveryEnabled:true,deliveryFeeMinor:12500}})).json();
 await page.goto("/");await page.getByLabel("Language", { exact: true }).selectOption("en");
 async function openAccount(){await page.getByText("More",{exact:true}).click();await page.getByRole("button",{name:"Account & shop",exact:true}).click();}
 await openAccount();const hub=page.locator(".customer-hub");await hub.getByRole("button",{name:"Start sandbox session",exact:true}).click();
 await hub.getByRole("button",{name:"Shop",exact:true}).click();await hub.getByRole("button",{name:"Add to cart",exact:true}).first().click();
 await hub.getByLabel("Name",{exact:true}).fill("Local customer");await hub.getByLabel("Your phone number",{exact:true}).fill("901234567");
 await expect(hub.getByLabel("City",{exact:true})).toHaveCount(0);await expect(hub.getByLabel("Address",{exact:true})).toHaveCount(0);
 const originalTotal=await hub.getByTestId("checkout-total").innerText();
 let submitted:any;
 await page.route("**/api/orders",async route=>{if(route.request().method()!=="POST")return route.continue();submitted=route.request().postDataJSON();const response=await route.fetch();expect(response.status()).toBe(201);await route.abort("failed");});
 await hub.getByRole("button",{name:"Place sandbox order",exact:true}).click();await expect(hub.getByTestId("pending-checkout")).toBeVisible();
 await expect(hub.getByLabel("Name",{exact:true})).toBeDisabled();await expect.poll(()=>submitted?.requestKey).toBeTruthy();
 const changed=await request.post("/api/admin/settings",{headers,data:{...config,pickupAddress:"Test pickup B",sellerName:"Test seller B",paymentDetails:"Test terms B",deliveryFeeMinor:22500}});expect(changed.status()).toBe(200);
 await page.unroute("**/api/orders");await page.reload();await openAccount();await hub.getByRole("button",{name:"Shop",exact:true}).click();
 await expect(hub.getByTestId("pending-checkout")).toBeVisible();await expect(hub.getByTestId("checkout-total")).toHaveText(originalTotal);await expect(hub.getByTestId("checkout-seller")).toContainText("Test seller A");
 await hub.getByRole("button",{name:"Retry this exact order",exact:true}).click();await expect(hub.getByTestId("pending-checkout")).toHaveCount(0);await expect(hub.getByTestId("order-seller-snapshot")).toHaveCount(1);await expect(hub.getByTestId("order-seller-snapshot")).toContainText("Test pickup A");
 await hub.getByRole("button",{name:"Administration",exact:true}).click();await hub.getByLabel("Administrator token",{exact:true}).fill(token);await hub.getByRole("button",{name:"Open administration",exact:true}).click();
 const business=hub.getByTestId("business-admin");await expect(business).toBeVisible();await business.getByLabel("Pickup address",{exact:true}).fill("Test pickup C");await business.getByRole("button",{name:"Save",exact:true}).click();
 await expect.poll(async()=> (await(await request.get("/api/storefront")).json()).settings.pickupAddress).toBe("Test pickup C");
 const title=`Local test news ${info.project.name} ${Date.now()}`;
 announcementTitle = title;
 await business.getByLabel("Title",{exact:true}).fill(title);await business.getByLabel("Message text",{exact:true}).fill("Local sandbox only; no external delivery");await business.getByRole("button",{name:"Publish announcement",exact:true}).click();
 await expect(page.getByTestId("announcements")).toContainText(title);await page.getByTestId("announcements").locator("article").filter({hasText:title}).getByRole("button",{name:"Dismiss message",exact:true}).click();await expect(page.getByTestId("announcements")).not.toContainText(title);
});
