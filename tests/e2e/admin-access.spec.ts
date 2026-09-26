import { expect, test } from "@playwright/test";

import {
  CLERK_E2E_REAL_INSTANCE,
  CLERK_E2E_REAL_INSTANCE_SKIP_REASON,
} from "./clerk-test-config";

/**
 * Every test in this file asserts Clerk's own signed-out redirect shape
 * (`/sign-in?redirect_url=...`). That is only observable against a real Clerk
 * instance, and the harness supplies a placeholder key. See
 * `./clerk-test-config.ts`; live verification is a manual check in
 * `docs/guides/release-checklist.md`.
 */
test.skip(!CLERK_E2E_REAL_INSTANCE, CLERK_E2E_REAL_INSTANCE_SKIP_REASON);

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

    await expect(page).toHaveURL(
      /\/sign-in\?redirect_url=%2Fadmin(?:&|$)/i,
    );
    await expect(page.locator("body")).not.toContainText("SabkaCollege Admin");
    await expect(page.locator("body")).not.toContainText("New course");
  });
}
