/**
 * Captures the public documentation/marketing pages as PNGs under
 * `docs/screenshots/`.
 *
 * Honesty rules this script is built around:
 *
 *   - The browser is the SYSTEM Chrome resolved by `scripts/system-chrome.ts`.
 *     There is no bundled Playwright Chromium in this repository, and this
 *     script never claims one exists. If Chrome is missing the script exits
 *     non-zero with an explanation instead of writing anything.
 *   - Only pages that actually render get a PNG. A non-2xx response, a failed
 *     navigation, or a missing expected heading is reported as `skipped` with
 *     the reason, and no file is written.
 *   - Pages behind authentication, and pages whose real content needs a
 *     database, are never screenshotted. They are reported as `skipped` with an
 *     explicit warning. No authenticated screenshot is ever fabricated.
 *   - The dev server is started with placeholder, non-secret env values only.
 *
 * Run: `bun run screenshots:capture`
 */

import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { chromium, type Browser, type Page } from "@playwright/test";

import { SYSTEM_CHROME_MISSING_REASON, resolveSystemChrome } from "./system-chrome";

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "..");
const OUTPUT_DIRECTORY = path.join(REPOSITORY_ROOT, "docs", "screenshots");
const HOST = "127.0.0.1";
const PORT = 3010;
const BASE_URL = `http://${HOST}:${PORT}`;

/**
 * A fixed viewport plus `deviceScaleFactor: 1` and reduced motion keeps the
 * output byte-comparable between runs. Two runs on the same commit differ only
 * by the content that actually changed.
 */
const VIEWPORT = { width: 1440, height: 900 } as const;

const SERVER_BOOT_TIMEOUT_MS = 120_000;
const NAVIGATION_TIMEOUT_MS = 30_000;

/**
 * Placeholder credentials. These are the public Clerk test-mode keys that ship
 * in the Playwright config: they are not secrets, they cannot reach a real
 * tenant, and they exist only so the Clerk provider renders.
 */
const DEV_SERVER_ENV = {
  CLERK_SECRET_KEY: "sk_test_docs_screenshots_placeholder",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    "pk_test_ZWxlbW9udGVzdC05MjMzMi5jbGVyay5hY2NvdW50cy5kZXYk",
} as const;

type PageTarget = {
  /** File name written to `docs/screenshots`. */
  readonly file: string;
  /** Route on the dev server. */
  readonly path: string;
  /** Text that must appear for the capture to be considered real. */
  readonly expectText: string;
  /** Optional extra text recorded in the report when present. */
  readonly noteWhenContains?: { readonly text: string; readonly note: string };
};

const CAPTURED_TARGETS: readonly PageTarget[] = [
  {
    file: "landing-page.png",
    path: "/",
    expectText: "Learn with SabkaCollege",
  },
  {
    file: "pricing-page.png",
    path: "/pricing",
    expectText: "Pay once. Keep your course access.",
  },
  {
    file: "courses-page.png",
    path: "/courses",
    expectText: "Course catalogue",
    // The catalogue reads from Postgres. With no `DATABASE_URL` the route
    // degrades to a designed empty state rather than erroring, so this page is
    // still a real render — the report records which state was captured.
    noteWhenContains: {
      text: "Course catalogue is temporarily unavailable",
      note: "captured the no-database empty state, not real catalogue data",
    },
  },
  {
    file: "blog-page.png",
    path: "/blog",
    expectText: "Notes on learning",
  },
  {
    file: "docs-page.png",
    path: "/docs",
    expectText: "Teammate guides",
  },
];

const SKIPPED_TARGETS: readonly { readonly route: string; readonly reason: string }[] = [
  {
    route: "/dashboard",
    reason: "requires a signed-in Clerk session; no authenticated screenshot is fabricated",
  },
  {
    route: "/admin",
    reason: "requires a signed-in Clerk session and an admin role",
  },
  {
    route: "/sign-in, /sign-up",
    reason: "Clerk-hosted auth screens render third-party UI and need a real tenant",
  },
  {
    route: "/courses/[slug], /courses/[slug]/preview/[lesson]",
    reason: "needs a live database row for a published course and lesson",
  },
];

type CaptureResult = {
  readonly file: string;
  readonly route: string;
  readonly status: "captured" | "skipped";
  readonly reason: string;
  readonly note?: string;
};

const warn = (message: string): void => {
  process.stderr.write(`WARN  ${message}\n`);
};

const log = (message: string): void => {
  process.stdout.write(`${message}\n`);
};

const startDevServer = async (): Promise<ChildProcess> => {
  log(`Starting the dev server on ${BASE_URL} with placeholder env only...`);

  const child = spawn(
    "bun",
    ["run", "dev", "--", "--hostname", HOST, "--port", String(PORT)],
    {
      cwd: REPOSITORY_ROOT,
      // Built from an allow-list rather than `{ ...process.env }`. A spawned
      // child would otherwise inherit `DATABASE_URL`, `CLERK_SECRET_KEY`, and
      // `STRIPE_SECRET_KEY` from the developer shell, and the documentation
      // pages must render with placeholder, non-secret values only.
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        NODE_ENV: "development",
        ...DEV_SERVER_ENV,
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let output = "";
  const record = (chunk: Buffer): void => {
    output += chunk.toString();
    if (output.length > 8192) {
      output = output.slice(-8192);
    }
  };
  child.stdout?.on("data", record);
  child.stderr?.on("data", record);

  const deadline = Date.now() + SERVER_BOOT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `The dev server exited with code ${child.exitCode} before it became ready.\n${output}`,
      );
    }

    try {
      const response = await fetch(`${BASE_URL}/sign-in`, {
        signal: AbortSignal.timeout(5_000),
      });
      // Any HTTP answer means the server is listening. `/sign-in` is used
      // because it is the route the Playwright config already waits on.
      if (response.status < 600) {
        log("Dev server is ready.");
        return child;
      }
    } catch {
      // Not listening yet; keep polling.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  child.kill("SIGTERM");
  throw new Error(
    `The dev server did not answer within ${SERVER_BOOT_TIMEOUT_MS}ms.\n${output}`,
  );
};

const stopDevServer = async (child: ChildProcess): Promise<void> => {
  if (child.exitCode !== null) {
    return;
  }

  log("Stopping the dev server...");
  const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
  child.kill("SIGTERM");

  const timedOut = await Promise.race([
    exited.then(() => false),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 10_000)),
  ]);

  if (timedOut) {
    warn("The dev server ignored SIGTERM; sending SIGKILL.");
    child.kill("SIGKILL");
    await exited;
  }
};

/**
 * Freezes CSS animations and transitions so a full-page screenshot is a
 * function of the markup, not of when the capture happened to run.
 */
const freezeMotion = async (page: Page): Promise<void> => {
  await page.addStyleTag({
    content: `*, *::before, *::after {
      animation-delay: -1ms !important;
      animation-duration: 1ms !important;
      animation-iteration-count: 1 !important;
      transition-delay: -1ms !important;
      transition-duration: 1ms !important;
      scroll-behavior: auto !important;
    }`,
  });
};

const captureTarget = async (
  browser: Browser,
  target: PageTarget,
): Promise<CaptureResult> => {
  const context = await browser.newContext({
    viewport: { ...VIEWPORT },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  try {
    const response = await page.goto(`${BASE_URL}${target.path}`, {
      waitUntil: "load",
      timeout: NAVIGATION_TIMEOUT_MS,
    });

    if (!response) {
      return {
        file: target.file,
        route: target.path,
        status: "skipped",
        reason: "the navigation produced no response",
      };
    }

    if (response.status() >= 400) {
      return {
        file: target.file,
        route: target.path,
        status: "skipped",
        reason: `the route answered HTTP ${response.status()}`,
      };
    }

    await freezeMotion(page);
    await page.waitForLoadState("networkidle", { timeout: NAVIGATION_TIMEOUT_MS });

    if (!(await page.getByText(target.expectText, { exact: false }).first().isVisible())) {
      return {
        file: target.file,
        route: target.path,
        status: "skipped",
        reason: `the page rendered without the expected text ${JSON.stringify(target.expectText)}`,
      };
    }

    const note = target.noteWhenContains;
    // Narrowing on `note` itself (not on a derived boolean) keeps TypeScript
    // able to prove the optional field is present before it is read.
    const noteToReport =
      note &&
      (await page
        .getByText(note.text, { exact: false })
        .first()
        .isVisible()
        .catch(() => false))
        ? note
        : undefined;

    const destination = path.join(OUTPUT_DIRECTORY, target.file);
    await page.screenshot({ path: destination, fullPage: true, animations: "disabled" });

    return {
      file: target.file,
      route: target.path,
      status: "captured",
      reason: `HTTP ${response.status()}`,
      ...(noteToReport ? { note: noteToReport.note } : {}),
    };
  } catch (error) {
    return {
      file: target.file,
      route: target.path,
      status: "skipped",
      reason: `navigation failed: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`,
    };
  } finally {
    await context.close();
  }
};

const writeReport = async (results: readonly CaptureResult[]): Promise<void> => {
  const captured = results.filter((result) => result.status === "captured");
  const skipped = results.filter((result) => result.status === "skipped");

  await writeFile(
    path.join(OUTPUT_DIRECTORY, "report.json"),
    `${JSON.stringify(
      {
        generator: "scripts/capture-docs-screenshots.ts",
        baseURL: BASE_URL,
        viewport: VIEWPORT,
        deviceScaleFactor: 1,
        captured: captured.map((result) => ({
          file: result.file,
          route: result.route,
          note: result.note,
        })),
        skipped: [
          ...skipped.map((result) => ({ route: result.route, reason: result.reason })),
          ...SKIPPED_TARGETS.map((entry) => ({ route: entry.route, reason: entry.reason })),
        ],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  log("");
  log(`Captured ${captured.length} image(s):`);
  for (const result of captured) {
    log(`  ${result.file}  <- ${result.route}${result.note ? `  (${result.note})` : ""}`);
  }
  log(`Skipped ${skipped.length} target(s) plus ${SKIPPED_TARGETS.length} never-captured route(s).`);
  for (const result of skipped) {
    warn(`skipped ${result.route}: ${result.reason}`);
  }
  for (const entry of SKIPPED_TARGETS) {
    warn(`skipped ${entry.route}: ${entry.reason}`);
  }
};

const main = async (): Promise<void> => {
  const executablePath = resolveSystemChrome();

  if (!executablePath) {
    process.stderr.write(`${SYSTEM_CHROME_MISSING_REASON}\n`);
    process.stderr.write(
      "No screenshots were written. Install the system Chrome and rerun.\n",
    );
    process.exitCode = 1;
    return;
  }

  log(`Using the system browser: ${executablePath}`);
  log("There is no bundled Playwright Chromium in this repository; this is the only supported path.");

  await mkdir(OUTPUT_DIRECTORY, { recursive: true });

  let server: ChildProcess | undefined;
  let browser: Browser | undefined;
  let failure: unknown;

  try {
    server = await startDevServer();
    browser = await chromium.launch({ executablePath });
  } catch (error) {
    failure = error;
  }

  const results: CaptureResult[] = [];

  if (!failure) {
    try {
      for (const target of CAPTURED_TARGETS) {
        results.push(await captureTarget(browser!, target));
      }
      await writeReport(results);
    } catch (error) {
      failure = error;
    }
  }

  await browser?.close();
  if (server) {
    await stopDevServer(server);
  }

  if (failure) {
    process.stderr.write(
      `\nThe capture run failed: ${failure instanceof Error ? failure.message : String(failure)}\n`,
    );
    process.exitCode = 1;
    return;
  }

  if (results.some((result) => result.status === "skipped")) {
    warn("At least one target did not render; see docs/screenshots/README.md for the expected states.");
  }
};

await main();
