import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "uz.iprasm.app",
  appName: "Ip Rasm",
  webDir: "dist",
  android: { allowMixedContent: false },
  ios: { contentInset: "automatic" },
};
export default config;
