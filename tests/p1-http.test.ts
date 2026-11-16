import { CatalogStore } from "../server/catalog-store";
import { test, expect } from "vitest";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdirSync, mkdtempSync } from "node:fs";
import { resolve, join } from "node:path";
import { randomBytes } from "node:crypto";
import { KitStore } from "../server/kit-store";
import { hashAdminPassword } from "../server/production-auth";
import { FEATURE_NAMES } from "../src/feature-policy";
import { assertTestPorts } from "../server/test-safety.mjs";

async function fixture(features?: string) {
  mkdirSync("test-results",{recursive:true});const dir=mkdtempSync(resolve("test-results/p1-http-")),pepper=randomBytes(32).toString("base64url"),payment=randomBytes(32).toString("base64url"),password="Synthetic-P1-owner-password-123";
  const db=join(dir,"database.sqlite"),store=new KitStore(db,pepper,payment);store.seed();store.updateProduct("admin",{...store.products()[0],id:"dev-mosaic",family:"brick",expectedRevision:0});const catalog=new CatalogStore(store);catalog.save("owner",{product:{id:"p1-string-bundle",name:"Synthetic bundle",family:"string",price_minor:10000,stock:100,credits:3,active:1,currency:"UZS",description:"Synthetic optional component",expectedRevision:0,profile_id:"standard-base-r1"},sku:{version:"catalog-sku/1",productId:"p1-string-bundle",kind:"bundle",group:"p1",label:"p1",material:"Synthetic",sellable:true,parts:[{productId:"dev-mosaic",quantity:2}],revision:0}});const code=store.issueKitBatch("admin","standard-base-r1",1,"p1-http-fixture").codes[0].code;store.close();
  let port=0;
  while(!port){const socket=createServer();await new Promise<void>(ok=>socket.listen(0,"127.0.0.1",ok));const candidate=(socket.address() as {port:number}).port;await new Promise<void>(ok=>socket.close(()=>ok()));try{assertTestPorts(candidate,candidate+1);if(![4900,4901,4920,4921,4940,4941].includes(candidate))port=candidate;}catch{}}
  const child=spawn(process.execPath,["--import","tsx","server/index.ts"],{windowsHide:true,env:{...process.env,NODE_ENV:"production",HOST:"127.0.0.1",PORT:String(port),IP_RASM_TEST_SERVER:"1",DATABASE_PATH:db,ERASURE_LEDGER_PATH:join(dir,"erasure.sqlite"),APP_ORIGIN:"https://p1.example.invalid",ADMIN_PASSWORD_HASH:await hashAdminPassword(password),CODE_PEPPER:pepper,SANDBOX_PAYMENT_KEY:payment,FEATURES:features,SERVER_GENERATION:"1",FCM_MODE:"disabled",TRANSACTIONAL_EMAIL_MODE:"disabled"},stdio:["ignore","pipe","pipe"]});
  await new Promise<void>((ok,no)=>{const timer=setTimeout(()=>{child.kill();no(Error("Isolated P1 API startup timeout"));},20000);child.once("error",no);child.once("exit",code=>{clearTimeout(timer);no(Error("Isolated P1 API exited "+code));});child.stdout.on("data",data=>{if(String(data).includes("ready on port")){clearTimeout(timer);ok();}});});
  const request=(path:string,body?:unknown,token?:string,method?:string)=>fetch(`http://127.0.0.1:${port}/api`+path,{method:method??(body===undefined?"GET":"POST"),headers:{"content-type":"application/json",...(token?{authorization:"Bearer "+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {request,code,password,async close(){if(child.exitCode!==null)return;const done=new Promise<void>(ok=>child.once("exit",()=>ok()));child.kill();await done;}};
}
test("actual production defaults refuse disabled routes before auth/body/OPTIONS; core kit/account/contact flows remain usable", async()=>{
  const api=await fixture();try{
    const config=await(await api.request("/features")).json();expect(config.version).toBe("iprasm.features/1");expect(Object.keys(config.features)).toHaveLength(FEATURE_NAMES.length);expect(Object.values(config.features).every(v=>!v)).toBe(true);
    for(const route of ["/gallery","/admin/gallery","/push/config","/admin/push/enqueue","/partner/quotes","/commissions","/admin/commissions/products","/analytics/events","/admin/analytics","/inbox","/admin/mail","/trial/claim","/admin/trials/policy","/offers/quote","/gifts/redeem","/digital/purchases","/photo-backup"]){expect((await api.request(route)).status).toBe(404);expect((await api.request(route,{},undefined,"POST")).status).toBe(404);expect((await api.request(route,undefined,undefined,"OPTIONS")).status).toBe(404);}
    const catalog=await(await api.request("/catalog")).json();expect(catalog.products.some((p:any)=>["dev-mosaic","p1-string-bundle"].includes(p.id))).toBe(false);
    expect((await api.request("/generation/config")).status).toBe(200);
    const guest=await(await api.request("/session",{})).json();expect(guest.token).toBeTruthy();expect((await api.request("/codes/redeem",{code:api.code},guest.token)).status).toBe(200);
    const login=await(await api.request("/admin/login",{password:api.password})).json();expect(login.token).toBeTruthy();
    const original=await(await api.request("/admin/settings",undefined,login.token)).json();expect((await api.request("/admin/settings",{...original,sellerTelegram:"p1_contact",sellerPhone:"+998901234567"},login.token)).status).toBe(200);
    const live=await(await api.request("/storefront")).json();expect(live.settings.sellerTelegram).toBe("p1_contact");expect(live.settings.sellerPhone).toBe("+998901234567");
    expect((await api.request("/orders",{items:[{productId:"dev-mosaic",quantity:1}],address:{}},guest.token)).status).toBe(404);
    expect((await api.request("/orders",{items:[{productId:"p1-string-bundle",quantity:1}],address:{}},guest.token)).status).toBe(404);
  }finally{await api.close();}
},60000);
test("actual production explicitly re-enables selected capabilities while unselected routes stay404",async()=>{
  const api=await fixture("gallery,mosaic,expert");try{const config=await(await api.request("/features")).json();expect(Object.entries(config.features).filter(([,v])=>v).map(([k])=>k).sort()).toEqual(["expert","gallery","mosaic"]);expect((await api.request("/gallery")).status).toBe(200);expect((await api.request("/admin/gallery")).status).not.toBe(404);expect((await api.request("/partner")).status).toBe(404);}finally{await api.close();}
},60000);
