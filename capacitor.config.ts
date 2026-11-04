import type { CapacitorConfig } from "@capacitor/cli";

// Never commit `server.url` here: live reload is passed on the CLI instead.
const config: CapacitorConfig = {
  appId: "com.lucapaduano.kakitai",
  appName: "Kakitai",
  webDir: "out",
  plugins: {
    SplashScreen: {
      // AppShell hides it once settings and the first screen are ready.
      launchAutoHide: false,
      backgroundColor: "#faf7f2",
      showSpinner: false,
    },
  },
};

export default config;
