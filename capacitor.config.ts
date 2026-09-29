import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "io.github.junyyyong.taptotest",
  appName: "TAPtoTEST",
  webDir: "dist",
  // Matches the warm paper skin so the WebView never flashes behind the app.
  backgroundColor: "#fff6e9",
  android: {
    backgroundColor: "#fff6e9",
  },
};

export default config;
