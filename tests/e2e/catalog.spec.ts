import { expect, test } from "@playwright/test";

test("course catalogue exposes shareable filters and a safe data state", async ({
  page,
}) => {
  await page.goto("/courses?q=designing&category=digital-skills");

  await expect(
    page.getByRole("heading", { level: 1, name: "Course catalogue" }),
  ).toBeVisible();
  await expect(page.getByRole("search", { name: "Filter courses" })).toBeVisible();
  await expect(page.getByLabel("Search courses")).toHaveValue("designing");
  await expect(page.getByText("Course catalogue is temporarily unavailable")).toBeVisible();
});

test("course routes handle unavailable data without exposing internals", async ({
  page,
}) => {
  await page.goto("/courses/unavailable-course");

  await expect(
    page.getByRole("heading", { name: "Course temporarily unavailable" }),
  ).toBeVisible();
  await expect(page.getByText(/Please try again soon/)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/stripe|videoReference|DATABASE_URL/i);
});

test("unknown preview routes do not expose playable media", async ({ page }) => {
  await page.goto("/courses/unavailable-course/preview/unavailable-lesson");

  await expect(
    page.getByRole("heading", { name: "Preview temporarily unavailable" }),
  ).toBeVisible();
  await expect(page.locator("iframe, video")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/videoReference|DATABASE_URL/i);
});
