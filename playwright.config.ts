import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command:
      "env -u DATABASE_URL CLERK_SECRET_KEY=sk_test_task7_placeholder NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZWxlbW9udGVzdC05MjMzMi5jbGVyay5hY2NvdW50cy5kZXYk bun run dev -- --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000/sign-in",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
