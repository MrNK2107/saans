import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  // A production build, so the strict CSP is what gets tested. The mock AI keeps runs deterministic.
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: {
      AI_PROVIDER: "mock",
      AIR_SOURCE: "sample",
      RATE_LIMIT_SCALE: "50",
      // A made-up Firebase project so the sign-in dialog is present, without touching a real one.
      NEXT_PUBLIC_FIREBASE_API_KEY: "e2e-placeholder",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-saans.firebaseapp.com",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-saans",
      NEXT_PUBLIC_FIREBASE_APP_ID: "1:0:web:e2e",
    },
  },
});
