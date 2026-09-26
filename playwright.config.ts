import { defineConfig, devices } from "@playwright/test";

import { resolveSystemChrome } from "./scripts/system-chrome";

/**
 * SYSTEM-CHROME FALLBACK
 *
 * This repository does not vendor a Playwright browser download: there is no
 * `playwright install` step in setup, and `~/.cache/ms-playwright` is empty on
 * a clean checkout. A stock `devices["Desktop Chrome"]` project therefore
 * fails to launch with "Executable doesn't exist".
 *
 * So the `chromium` project runs the Chrome/Chromium already installed on the
 * machine, resolved by `scripts/system-chrome.ts` (env override, then a list
 * of well-known install paths). Two consequences, both deliberate:
 *
 *   - When the system browser is MISSING, no `executablePath` is set. The
 *     project falls back to Playwright's own lookup, and if that is also empty
 *     the browser-dependent tests in `tests/e2e/screenshots.spec.ts` skip with
 *     an explicit reason instead of reporting a pass they did not earn. Tests
 *     that do not need a browser are unaffected.
 *   - When the system browser is PRESENT, every e2e test uses it, so the suite
 *     runs on a machine with no browser download at all.
 *
 * Set `PLAYWRIGHT_CHROME_EXECUTABLE` to override the resolution.
 *
 * This affects the Playwright runner only. Vitest (`vitest.config.ts`) is a
 * separate process with its own config and never reads this file.
 */
const systemChrome = resolveSystemChrome();

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
      use: {
        ...devices["Desktop Chrome"],
        ...(systemChrome ? { launchOptions: { executablePath: systemChrome } } : {}),
      },
    },
  ],
  webServer: {
    // Placeholder, non-secret Clerk test keys and no `DATABASE_URL`, so the
    // suite never depends on real credentials or a live database.
    command:
      "env -u DATABASE_URL CLERK_SECRET_KEY=sk_test_task7_placeholder NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZWxlbW9udGVzdC05MjMzMi5jbGVyay5hY2NvdW50cy5kZXYk bun run dev -- --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000/sign-in",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
