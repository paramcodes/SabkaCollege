import { existsSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  SYSTEM_CHROME_MISSING_REASON,
  resolveSystemChrome,
} from "../../scripts/system-chrome";

/**
 * These tests screenshot the public pages and assert the files land on disk.
 *
 * The browser is the SYSTEM Chrome, configured in `playwright.config.ts` via
 * `launchOptions.executablePath` from `scripts/system-chrome.ts`. This
 * repository does NOT vendor a Playwright Chromium download, so when the
 * system browser is absent these tests SKIP with a reason. They never fall back
 * to a bundled Chromium and they never report a pass for a run that did not
 * launch a browser.
 */
const systemChrome = resolveSystemChrome();

test.skip(
  !systemChrome,
  `system Chrome unavailable — ${SYSTEM_CHROME_MISSING_REASON}`,
);

/**
 * `import.meta.dirname` is a Bun/ESM-only property and is `undefined` when the
 * Playwright runner transpiles this spec for its own Node-based registry, which
 * would silently resolve every screenshot to `<cwd>/undefined/...`. Playwright
 * always launches from the project root (the directory holding
 * `playwright.config.ts`), so `process.cwd()` is the stable anchor here. The
 * output directory is a THROWAWAY location: it proves the capture works and is
 * gitignored. The committed, reviewed images are produced separately by
 * `bun run screenshots:capture` and live in `docs/screenshots/`.
 */
const ARTIFACT_DIRECTORY = path.resolve(
  process.cwd(),
  "test-results/screenshots",
);

/** The pages that must render publicly, with the text that proves a real render. */
const PUBLIC_PAGES = [
  { name: "landing", route: "/", expected: "Learn with SabkaCollege" },
  { name: "pricing", route: "/pricing", expected: "Pay once" },
  { name: "courses", route: "/courses", expected: "Course catalogue" },
  { name: "blog", route: "/blog", expected: "Notes on learning" },
  { name: "docs", route: "/docs", expected: "Teammate guides" },
] as const;

test.describe("documentation screenshots", () => {
  test.beforeAll(() => {
    expect(systemChrome, SYSTEM_CHROME_MISSING_REASON).not.toBeNull();
  });

  for (const page of PUBLIC_PAGES) {
    test(`captures ${page.name} from ${page.route}`, async ({ page: browserPage }) => {
      const response = await browserPage.goto(page.route, { waitUntil: "load" });

      expect(response, `${page.route} returned no response`).not.toBeNull();
      expect(response!.status(), `${page.route} returned an error status`).toBeLessThan(400);

      await expect(
        browserPage.getByText(page.expected, { exact: false }).first(),
      ).toBeVisible();

      const destination = path.join(ARTIFACT_DIRECTORY, `${page.name}-page.png`);
      await browserPage.screenshot({
        path: destination,
        fullPage: true,
        animations: "disabled",
      });

      expect(
        existsSync(destination),
        `${destination} was not written. Run \`bun run screenshots:capture\` to produce the committed set under docs/screenshots/.`,
      ).toBe(true);
    });
  }

  test("the docs page renders every guide from docs/guides", async ({ page: browserPage }) => {
    const response = await browserPage.goto("/docs", { waitUntil: "load" });

    expect(response?.status()).toBeLessThan(400);
    // A guide is only rendered if its frontmatter parsed at build time.
    await expect(
      browserPage.getByRole("link", { name: /getting started/i }).first(),
    ).toBeVisible();
    await expect(
      browserPage.locator("article").first(),
    ).toBeVisible();
  });

  test("anonymous /dashboard never renders dashboard content", async ({
    page: browserPage,
  }) => {
    /**
     * PLACEHOLDER CLERK TENANT LIMITATION
     *
     * The Playwright web server boots with a syntactically valid but
     * non-existent Clerk test tenant (`sk_test_task7_placeholder` /
     * `pk_test_ZWxlbW9udGVzdC05MjMzMi5jbGVyay5hY2NvdW50cy5kZXYk`). There is
     * no real Clerk instance behind it, so a request to a protected route
     * cannot be proven to redirect to a *working* sign-in page: Clerk's
     * middleware throws a provider/configuration error that the route error
     * boundary renders instead of a sign-in screen. Asserting "a sign-in
     * prompt appears" here would be a claim about a tenant that does not
     * exist, so this test does not make it.
     *
     * What IS provable on this fixture, and is the property that actually
     * matters for security, is the negative one: an anonymous request for
     * `/dashboard` must never render dashboard content. Each of the three
     * markers below is a literal string from `app/(student)/dashboard/page.tsx`
     * ("Welcome back, …", "Overall progress", "Enrolled courses"), so each
     * can only be present if the protected component tree rendered. If any
     * one of them is visible to an anonymous visitor, the route leaked.
     *
     * This is deliberately NOT weakened to an assertion that always passes
     * (e.g. "the page is not blank" or "the body is non-empty"). A redirect
     * target, a provider error, or a sign-in page all satisfy those, so they
     * would pass even if the dashboard rendered. A test that cannot fail is
     * worse than no test.
     *
     * No authenticated screenshot is taken and no real sign-in behavior is
     * claimed here. The authenticated case is out of scope for this fixture;
     * the capture script skips protected routes entirely.
     */
    const response = await browserPage.goto("/dashboard", { waitUntil: "load" });

    // Log what actually rendered, so a failure (or a future fixture change)
    // is diagnosable rather than a silent pass/fail flip.
    const bodyText = (await browserPage.locator("body").innerText()).slice(0, 400);

    test.info().annotations.push({
      type: "anonymous /dashboard body",
      description: bodyText.replace(/\s+/g, " ").trim(),
    });

    for (const leakedMarker of [
      "Welcome back",
      "Overall progress",
      "Enrolled courses",
    ]) {
      await expect(
        browserPage.getByText(leakedMarker, { exact: false }),
        `anonymous /dashboard rendered "${leakedMarker}". Protected dashboard content is publicly readable.`,
      ).toHaveCount(0);
    }

    // A response is not asserted to be a redirect, because with the
    // placeholder tenant it is a provider error. The invariant under test is
    // content absence, not a specific status code.
    expect(response).not.toBeNull();
  });
});
