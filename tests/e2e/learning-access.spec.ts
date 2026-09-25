import { expect, test } from "@playwright/test";

test("protected learning redirects signed-out users without exposing course content", async ({ page }) => {
  await page.goto("/learn/foundations-of-modern-india/india-in-1947");

  await expect(page).toHaveURL(/\/sign-in\?redirect_url=%2Flearn%2Ffoundations-of-modern-india%2Findia-in-1947/i);
  await expect(page.locator("body")).not.toContainText("M7lc1UVf-VE");
  await expect(page.locator("body")).not.toContainText(/videoReference|video reference/i);
});
