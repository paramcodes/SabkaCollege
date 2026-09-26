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
/**
 * CLERK-E2E-REAL-INSTANCE OPT-IN
 *
 * The auth-redirect specs in `tests/e2e/clerk-test-config.ts` assert Clerk's
 * own redirect behaviour. A placeholder key cannot honestly measure that, so
 * they are gated on `CLERK_E2E_REAL_INSTANCE=1` and skip with a stated reason
 * otherwise.
 *
 * The default is `0`, resolved once here and written back to
 * `process.env` so the specs in `tests/e2e/clerk-test-config.ts` and the child
 * dev server read the same normalized value. A value inherited from an
 * earlier shell therefore cannot leave the suite un-gated against a tenant it
 * is not pointed at.
 *
 * Two modes, and the two must not be mixed:
 *
 *   - Default (`0`): the dev server gets non-secret placeholder Clerk keys and
 *     no `DATABASE_URL`. Nothing real is contacted.
 *   - Opted in (`1`): the dev server **inherits** `CLERK_SECRET_KEY` and
 *     `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` from this process instead of
 *     receiving placeholders. Overriding them with placeholders would make the
 *     gated tests run against the wrong tenant and report Clerk's behaviour as
 *     this repository's. Missing keys are a configuration error and stop the
 *     run here rather than half-way through a suite. Keys are read from the
 *     environment and are never interpolated into the command string, never
 *     printed, and never committed.
 *
 * `DATABASE_URL` stays unset in both modes, so no test can reach a live
 * database.
 */
const useRealClerkInstance =
  (process.env.CLERK_E2E_REAL_INSTANCE ?? "0") === "1";

if (useRealClerkInstance) {
  const missing = ["CLERK_SECRET_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"].filter(
    (name) => !process.env[name],
  );

  if (missing.length > 0) {
    throw new Error(
      `CLERK_E2E_REAL_INSTANCE=1 requires ${missing.join(" and ")} from a real ` +
        "Clerk test tenant. Export them and re-run, or unset " +
        "CLERK_E2E_REAL_INSTANCE to run the hermetic suite with placeholder keys. " +
        "The keys are read from the environment and are never written to a file.",
    );
  }
}

const clerkAuthEnv = useRealClerkInstance
  ? // Inherited, not re-declared: the real keys come from this process's
    // environment, so no secret ever appears in a command line or a report.
    "CLERK_E2E_REAL_INSTANCE=1"
  : "CLERK_E2E_REAL_INSTANCE=0 CLERK_SECRET_KEY=sk_test_task7_placeholder " +
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZWxlbW9udGVzdC05MjMzMi5jbGVyay5hY2NvdW50cy5kZXYk";

// The Playwright config is loaded by the runner process, and the specs run in
// processes forked from it, so this is the one place the resolved opt-in
// becomes visible to every reader.
process.env.CLERK_E2E_REAL_INSTANCE = useRealClerkInstance ? "1" : "0";

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
    // No `DATABASE_URL` in either mode, so the suite never depends on a live
    // database. The Clerk values are the conditional `clerkAuthEnv` above:
    // placeholders for the hermetic default, inherited real values when a
    // person opts in with `CLERK_E2E_REAL_INSTANCE=1`.
    command: `env -u DATABASE_URL ${clerkAuthEnv} bun run dev -- --hostname 127.0.0.1`,
    url: "http://127.0.0.1:3000/sign-in",
    // The two modes must not share a server. A dev server started in default
    // mode carries placeholder Clerk keys, so reusing it from an opted-in run
    // would measure Clerk's behaviour against the wrong tenant and report it as
    // this repository's. An opted-in run therefore always starts its own
    // server. In the default mode `!process.env.CI` is kept, so a local
    // placeholder/skip run still reuses an already-running dev server.
    reuseExistingServer: useRealClerkInstance ? false : !process.env.CI,
    timeout: 120_000,
  },
});
