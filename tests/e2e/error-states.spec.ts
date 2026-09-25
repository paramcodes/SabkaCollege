import { expect, test } from "@playwright/test";

/**
 * Error and unavailable-state coverage for the public route boundaries.
 *
 * The Playwright harness starts the dev server with DATABASE_URL explicitly
 * removed (see `playwright.config.ts`), so this suite runs against a server
 * with no database at all. That is a real configuration, not a mock, and the
 * suite is written around exactly what that configuration can and cannot
 * prove:
 *
 * - An invalid route slug is rejected by `courseSlugSchema.safeParse` before
 *   any data access, so `notFound()` is genuinely exercised here.
 * - A well-formed but unknown slug reaches the loaders, and with no
 *   DATABASE_URL every loader takes its documented "temporarily unavailable"
 *   branch. That is the real degraded production path, and it is asserted.
 * - The "well-formed slug, real database, row genuinely absent" branch
 *   (loader returns `not-found`) cannot be reached in this environment. That
 *   assertion is gated on a real seeded E2E database rather than faked with a
 *   mocked module, which would only prove the mock works.
 */

const sensitivePattern =
  /select \*|password_hash|clerk_session|sk_test_|whsec_|cs_test_|pi_|DATABASE_URL|at ServerComponent|Application error|Internal Server Error|\/home\/param/i;

/**
 * A slug the shared `safeSlugPattern` rejects (uppercase and underscores), so
 * the route fails validation without ever touching a data loader.
 */
const INVALID_COURSE_SLUG = "UPPERCASE_SLUG";

/** A slug that satisfies `safeSlugPattern` but matches no course. */
const UNKNOWN_COURSE_SLUG = "unknown-course-slug";
const UNKNOWN_LESSON_SLUG = "unknown-lesson-slug";

test.describe("route validation boundary (no database required)", () => {
  test("an invalid public course slug renders the course not-found boundary", async ({
    page,
  }) => {
    await page.goto(`/courses/${INVALID_COURSE_SLUG}`);

    await expect(
      page.getByRole("heading", { level: 1, name: "Course not found" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse public courses" })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(sensitivePattern);
  });

  test("a course sub-route shares the course not-found boundary", async ({ page }) => {
    await page.goto(`/courses/${INVALID_COURSE_SLUG}/syllabus`);

    await expect(
      page.getByRole("heading", { level: 1, name: "Course not found" }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText(sensitivePattern);
  });

  test("an invalid slug on the preview route renders the preview not-found boundary", async ({
    page,
  }) => {
    await page.goto(`/courses/${INVALID_COURSE_SLUG}/preview/${INVALID_COURSE_SLUG}`);

    await expect(
      page.getByRole("heading", { level: 1, name: "Preview not found" }),
    ).toBeVisible();
    await expect(page.locator("iframe, video")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(sensitivePattern);
  });
});

test.describe("safe unavailable state (no DATABASE_URL)", () => {
  test("a well-formed unknown course slug degrades without leaking internals", async ({
    page,
  }) => {
    await page.goto(`/courses/${UNKNOWN_COURSE_SLUG}`);

    await expect(
      page.getByRole("heading", { level: 1, name: "Course temporarily unavailable" }),
    ).toBeVisible();
    await expect(page.getByTestId("retry-boundary")).toBeVisible();
    await expect(page.getByRole("link", { name: "Return to courses" })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(sensitivePattern);
  });

  test("the syllabus sub-route degrades on its own safe state", async ({ page }) => {
    await page.goto(`/courses/${UNKNOWN_COURSE_SLUG}/syllabus`);

    await expect(
      page.getByRole("heading", { level: 1, name: "Syllabus temporarily unavailable" }),
    ).toBeVisible();
    await expect(page.getByTestId("retry-boundary")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(sensitivePattern);
  });

  test("the preview sub-route degrades without exposing playable media", async ({ page }) => {
    await page.goto(`/courses/${UNKNOWN_COURSE_SLUG}/preview/${UNKNOWN_LESSON_SLUG}`);

    await expect(
      page.getByRole("heading", { level: 1, name: "Preview temporarily unavailable" }),
    ).toBeVisible();
    await expect(page.getByTestId("retry-boundary")).toBeVisible();
    await expect(page.locator("iframe, video")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(sensitivePattern);
  });
});

test.describe("authentication boundaries", () => {
  test("an unauthenticated learning request reaches a sign-in state, not a server error", async ({
    page,
  }) => {
    await page.goto(`/learn/${UNKNOWN_COURSE_SLUG}/${UNKNOWN_LESSON_SLUG}`);

    await expect(page).toHaveURL(
      new RegExp(
        `/sign-in\\?redirect_url=%2Flearn%2F${UNKNOWN_COURSE_SLUG}%2F${UNKNOWN_LESSON_SLUG}`,
        "i",
      ),
    );
    await expect(page.locator("body")).not.toContainText(sensitivePattern);
    await expect(page.locator("iframe, video")).toHaveCount(0);
  });

  test("an unauthenticated admin request reaches a sign-in state, not a server error", async ({
    page,
  }) => {
    await page.goto("/admin/courses/new");

    await expect(page).toHaveURL(/\/sign-in\?redirect_url=%2Fadmin%2Fcourses%2Fnew/i);
    await expect(page.locator("body")).not.toContainText(sensitivePattern);
  });

  test("an unauthenticated dashboard request reaches a sign-in state, not a server error", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/sign-in\?redirect_url=%2Fdashboard(?:&|$)/i);
    await expect(page.locator("body")).not.toContainText(sensitivePattern);
  });
});

/**
 * The remaining boundary: a syntactically valid slug that a *live* seeded
 * database genuinely has no row for. This is the only branch that proves the
 * loader's `status: "not-found"` return actually produces a 404-style page,
 * and it is unreachable while the harness runs without a database.
 *
 * It is skipped rather than stubbed. Mocking the query module would make the
 * test pass in an environment where the real loader has never been observed
 * returning `not-found`, which is a false green.
 *
 * To run it, start the dev server against a migrated and seeded database and
 * set both variables below in the Playwright process environment.
 */
const seededDatabaseUrl = process.env.E2E_DATABASE_URL;
const seededMissingCourseSlug = process.env.E2E_MISSING_COURSE_SLUG;

test.describe("live-database not-found boundary", () => {
  test.skip(
    !seededDatabaseUrl || !seededMissingCourseSlug,
    "Requires a seeded E2E database: set E2E_DATABASE_URL and E2E_MISSING_COURSE_SLUG " +
      "(a well-formed slug with no row in that database) and run the dev server against it.",
  );

  test("a well-formed slug with no course row renders the not-found boundary", async ({
    page,
  }) => {
    await page.goto(`/courses/${seededMissingCourseSlug}`);

    await expect(
      page.getByRole("heading", { level: 1, name: "Course not found" }),
    ).toBeVisible();
    await expect(page.getByTestId("retry-boundary")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(sensitivePattern);
  });
});
