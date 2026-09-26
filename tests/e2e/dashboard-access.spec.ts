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

test("student dashboard fails closed for signed-out users", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/sign-in\?redirect_url=%2Fdashboard(?:&|$)/i);
  await expect(page.locator("body")).not.toContainText("Your learning");
  await expect(page.locator("body")).not.toContainText(/stripe|payment|progress/i);
});
