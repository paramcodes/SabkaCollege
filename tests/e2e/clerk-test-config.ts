/**
 * Whether this run may exercise the *live* Clerk auth-redirect boundary.
 *
 * The Playwright harness starts its dev server with the placeholder
 * `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in `playwright.config.ts`. That value is
 * not a stand-in for "no auth": it is a syntactically valid Clerk **development**
 * key, so Clerk happily resolves it to a real dev instance. The sign-in page
 * therefore renders real third-party UI, and Clerk's own redirect handling is
 * in the loop.
 *
 * That makes the auth-redirect assertions in `admin-access.spec.ts`,
 * `dashboard-access.spec.ts`, `learning-access.spec.ts`, and the authentication
 * block in `error-states.spec.ts` environment-dependent. They are honest tests
 * of a real deployment and meaningless ones of a placeholder: they can fail
 * (or pass) for reasons that have nothing to do with this repository.
 *
 * So they are gated on `CLERK_E2E_REAL_INSTANCE=1`, which is only ever set
 * deliberately, by a person who has pointed the harness at a real Clerk test
 * tenant. The default in `playwright.config.ts` is `0`, so the honest outcome on
 * a developer machine is a *skip with a stated reason* — never a green that was
 * not earned, and never a red that misattributes a Clerk-side problem to this
 * codebase.
 *
 * To actually run them you need a real Clerk test tenant and its keys:
 *
 *   CLERK_E2E_REAL_INSTANCE=1 \
 *   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_<real-test-tenant> \
 *   bunx playwright test tests/e2e/dashboard-access.spec.ts
 *
 * `playwright.config.ts` resolves the opt-in before it starts the dev server:
 * with `1` the `webServer` command passes only `CLERK_E2E_REAL_INSTANCE=1`, so
 * the two real keys above are *inherited* from the runner's environment rather
 * than replaced with placeholders, and a missing key fails the run immediately
 * instead of measuring the wrong tenant. The keys are never interpolated into a
 * command string, never printed, and never written to a file. Live verification
 * is tracked as a manual check in `docs/guides/release-checklist.md`.
 */
export const CLERK_E2E_REAL_INSTANCE = process.env.CLERK_E2E_REAL_INSTANCE === "1";

/**
 * The reason shown next to every skipped auth-redirect test. It names the
 * missing thing (a real Clerk test tenant) rather than describing the symptom.
 */
export const CLERK_E2E_REAL_INSTANCE_SKIP_REASON =
  "Requires a real Clerk test tenant: the harness runs with a placeholder publishable key that " +
  "resolves to a Clerk dev instance, so the auth-redirect boundary cannot be verified here. Set " +
  "CLERK_E2E_REAL_INSTANCE=1 with a real Clerk test tenant and its keys. See " +
  "docs/guides/release-checklist.md.";
