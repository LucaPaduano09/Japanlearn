import type { CapacitorConfig } from "@capacitor/cli";

// Never commit `server.url` here: live reload is passed on the CLI instead.
const config: CapacitorConfig = {
  appId: "com.lucapaduano.kakitai",
  appName: "Kakitai",
  webDir: "out",
};

export default config;
