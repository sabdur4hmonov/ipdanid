import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "uz.iprasm.app",
  appName: "Ip Rasm",
  webDir: process.env.IP_RASM_NATIVE_WEB_DIR || "dist",
  android: { allowMixedContent: false },
  ios: { contentInset: "automatic" },
};
export default config;
