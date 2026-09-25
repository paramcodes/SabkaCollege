import { expect, test } from "@playwright/test";

test("landing page introduces SabkaCollege and links to courses", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /SabkaCollege/ })).toBeVisible();

  const coursesLink = page.locator('a[href="/courses"]').first();
  await expect(coursesLink).toBeVisible();
  await expect(coursesLink).toHaveAttribute("href", "/courses");
});

test("landing course cards expose semantic titles and descriptive links", async ({ page }) => {
  await page.goto("/");

  const courseTitle = "Designing clear digital products";
  await expect(page.getByRole("heading", { level: 3, name: courseTitle })).toBeVisible();
  await expect(
    page.getByRole("link", { name: `View ${courseTitle} course` }),
  ).toBeVisible();
});

test("mobile navigation moves focus into and back out of the menu", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const toggle = page.getByRole("button", { name: "Open navigation menu" });
  await toggle.click();

  const firstMobileLink = page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link")
    .first();
  await expect(firstMobileLink).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(firstMobileLink).toBeHidden();
  await expect(toggle).toBeFocused();
});
