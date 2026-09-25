import { expect, test } from "@playwright/test";

test("student dashboard fails closed for signed-out users", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/sign-in\?redirect_url=%2Fdashboard(?:&|$)/i);
  await expect(page.locator("body")).not.toContainText("Your learning");
  await expect(page.locator("body")).not.toContainText(/stripe|payment|progress/i);
});
