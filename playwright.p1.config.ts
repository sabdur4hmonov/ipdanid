import { defineConfig } from "@playwright/test";
import protectedConfig from "./playwright.protected.config";
const servers=Array.isArray(protectedConfig.webServer)?protectedConfig.webServer:[protectedConfig.webServer!];
export default defineConfig({
  ...protectedConfig,
  testDir:"tests/p1-e2e",
  testMatch:"production-readiness.spec.ts",
  webServer:servers.map((server,index)=>index===0?{...server,env:{...server.env,FEATURES:process.env.IP_RASM_P1_FEATURES??""}}:server),
});
