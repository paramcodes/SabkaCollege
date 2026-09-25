import { expect, test } from "@playwright/test";

const adminRoutes = [
  "/admin",
  "/admin/courses",
  "/admin/courses/new",
  "/admin/courses/10000000-0000-4000-8000-000000000001/edit",
  "/admin/students",
  "/admin/purchases",
];

for (const route of adminRoutes) {
  test(`admin route fails closed for signed-out users: ${route}`, async ({ page }) => {
    await page.goto(route);

    await expect(page).not.toHaveURL(/\/admin(?:\/|$)/);
    await expect(page.locator("body")).not.toContainText("SabkaCollege Admin");
    await expect(page.locator("body")).not.toContainText("New course");
  });
}
