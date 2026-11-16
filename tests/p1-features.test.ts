import { expect, test } from "vitest";
import { FEATURE_NAMES, resolveFeatures, validFeatures, craftsEnabled, routeFeature, familyEnabled } from "../src/feature-policy";
import { configuredContact, telegramContact, phoneContact } from "../src/owner-contact";
import { BusinessStore } from "../server/business-store";
import { KitStore } from "../server/kit-store";

test("production and explicit empty allowlists are core-only; every named flag can be independently enabled", () => {
  const none=resolveFeatures({NODE_ENV:"production"});
  expect(Object.values(none).every(v=>!v)).toBe(true);
  expect(craftsEnabled(none)).toBe(false);expect(familyEnabled(none,"string")).toBe(true);
  expect(resolveFeatures({FEATURES:""})).toEqual(none);
  expect(Object.values(resolveFeatures({})).every(Boolean)).toBe(true);
  for(const name of FEATURE_NAMES){const enabled=resolveFeatures({NODE_ENV:"production",FEATURES:name});expect(validFeatures(enabled)).toBe(true);expect(Object.entries(enabled).filter(([,v])=>v).map(([k])=>k)).toEqual([name]);}
  for(const FEATURES of ["unknown","expert,expert","*","gallery;expert"])expect(()=>resolveFeatures({FEATURES})).toThrow();
  expect(validFeatures({...none,extra:true})).toBe(false);
  expect(familyEnabled(resolveFeatures({FEATURES:"mosaic"}),"brick")).toBe(true);
  expect(familyEnabled(none,"digital")).toBe(false);
});
test("all optional HTTP namespaces share the same flag mapping, including staff and nested paths", () => {
  const examples={gallery:["/api/gallery","/api/gallery/a/image","/api/admin/gallery/a/moderate"],push:["/api/push/config","/api/admin/push/enqueue"],partner:["/api/partner/quotes","/api/admin/partners"],commissions:["/api/commissions/a/guide","/api/admin/commissions/products"],analytics:["/api/analytics/events","/api/admin/analytics"],offers:["/api/offers/quote","/api/referrals","/api/admin/offers"],trials:["/api/trial/claim","/api/admin/trials/policy"],inbox:["/api/inbox","/api/admin/mail/a/retry"],digital:["/api/digital/purchases","/api/admin/journeys/products"],gifts:["/api/gifts/redeem"],photoBackup:["/api/photo-backup/read"]};
  for(const [feature,paths]of Object.entries(examples))for(const path of paths)expect(routeFeature(path)).toBe(feature);
  for(const path of ["/api/account","/api/admin/session","/api/generation/start","/api/builds/unlock","/api/kit-profiles","/api/admin/settings","/api/orders"])expect(routeFeature(path)).toBeUndefined();
});
test("Admin contacts are versioned, validated, publicly cached and used by all purchase links without rebuilding", () => {
  const store=new KitStore(":memory:","p".repeat(32),"k".repeat(32));
  try{const business=new BusinessStore(store),original=business.settings();
    const saved=business.saveSettings("owner",{...original,sellerTelegram:"maker_test",sellerPhone:"+998901234567"});
    const contact=configuredContact(new BusinessStore(store).settings());
    expect(telegramContact("work-123",contact)).toContain("https://t.me/maker_test?text=");expect(phoneContact(contact)).toBe("tel:+998901234567");
    expect(()=>business.saveSettings("owner",{...saved,sellerTelegram:"https://evil.invalid"})).toThrow();
    expect(()=>business.saveSettings("owner",original)).toThrow("another window");
    expect(configuredContact({}).telegram).toBe("SENING_USERNAME");
  }finally{store.close();}
});
