import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "uz.iprasm.app",
  appName: "Ip Rasm",
  webDir: process.env.IP_RASM_NATIVE_WEB_DIR || "dist",
  android: { allowMixedContent: false },
  ios: { contentInset: "automatic" },
  experimental: {
    ios: {
      spm: {
        packageOptions: {
          "@capacitor-firebase/messaging": {
            symlink: process.platform !== "win32",
          },
        },
      },
    },
  },
};
export default config;
