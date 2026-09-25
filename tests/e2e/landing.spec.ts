import { expect, test } from "@playwright/test";

test("landing page introduces SabkaCollege and links to courses", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /SabkaCollege/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /explore courses/i })).toBeVisible();
  await page.getByRole("link", { name: /explore courses/i }).click();
  await expect(page).toHaveURL(/\/courses/);
});
