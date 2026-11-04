import { defineConfig, devices } from "@playwright/test";

// e2e runs against the static export, the same files Capacitor ships.
export default defineConfig({
  testDir: "e2e",
  use: { baseURL: "http://localhost:4173" },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: "npm run build && npx serve out -l 4173",
    url: "http://localhost:4173",
    reuseExistingServer: true,
  },
});
