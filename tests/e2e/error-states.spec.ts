import { expect, test } from "@playwright/test";

const sensitivePattern =
  /select \*|password_hash|clerk_session|sk_test_|whsec_|cs_test_|DATABASE_URL|at ServerComponent|Application error|Internal Server Error|\/home\/param/i;

test("an invalid public course slug renders the course not-found boundary", async ({
  page,
}) => {
  await page.goto("/courses/UPPERCASE_SLUG");

  await expect(
    page.getByRole("heading", { level: 1, name: "Course not found" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse public courses" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(sensitivePattern);
});

test("a course sub-route shares the course not-found boundary", async ({ page }) => {
  await page.goto("/courses/UPPERCASE_SLUG/syllabus");

  await expect(
    page.getByRole("heading", { level: 1, name: "Course not found" }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText(sensitivePattern);
});

test("an unknown but well-formed public course slug degrades to a safe state", async ({
  page,
}) => {
  await page.goto("/courses/unknown-course-slug");

  await expect(
    page.getByRole("heading", { name: "Course temporarily unavailable" }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText(sensitivePattern);
});

test("an unauthenticated learning request reaches a sign-in state, not a server error", async ({
  page,
}) => {
  await page.goto("/learn/unknown-course-slug/unknown-lesson-slug");

  await expect(page).toHaveURL(
    /\/sign-in\?redirect_url=%2Flearn%2Funknown-course-slug%2Funknown-lesson-slug/i,
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
