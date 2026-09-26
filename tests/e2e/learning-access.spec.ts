import { expect, test } from "@playwright/test";

import {
  CLERK_E2E_REAL_INSTANCE,
  CLERK_E2E_REAL_INSTANCE_SKIP_REASON,
} from "./clerk-test-config";

/**
 * Asserts Clerk's signed-out redirect shape, so it needs a real Clerk instance
 * rather than the placeholder key the harness starts with. See
 * `./clerk-test-config.ts` and the live-check list in
 * `docs/guides/release-checklist.md`.
 */
test.skip(!CLERK_E2E_REAL_INSTANCE, CLERK_E2E_REAL_INSTANCE_SKIP_REASON);

test("protected learning redirects signed-out users without exposing course content", async ({ page }) => {
  await page.goto("/learn/foundations-of-modern-india/india-in-1947");

  await expect(page).toHaveURL(/\/sign-in\?redirect_url=%2Flearn%2Ffoundations-of-modern-india%2Findia-in-1947/i);
  await expect(page.locator("body")).not.toContainText("M7lc1UVf-VE");
  await expect(page.locator("body")).not.toContainText(/videoReference|video reference/i);
});
