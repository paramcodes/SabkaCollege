import { expect, test } from "@playwright/test";

test("admin routes fail closed for signed-out users", async ({ page }) => {
  await page.goto("/admin");

  await expect(page).not.toHaveURL(/\/admin(?:\/|$)/);
  await expect(page.locator("body")).not.toContainText("SabkaCollege Admin");
  await expect(page.locator("body")).not.toContainText("New course");
});
