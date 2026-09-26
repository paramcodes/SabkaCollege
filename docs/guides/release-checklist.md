---
title: "Release checklist"
description: "The eight manual live acceptance checks that stand between a green local build and a real release, and why none of them can be automated here."
slug: "release-checklist"
publishedAt: "2026-03-02"
readingTime: "7 min read"
tags: ["release", "operations", "manual-checks", "acceptance"]
---

## Purpose

The automated suite in this repository is deliberately hermetic. It runs with
placeholder credentials, no database, and no third-party traffic, which is what
makes it fast and trustworthy — and also what makes it unable to prove anything
about Clerk, Stripe, or Neon.

Everything that requires a real tenant, a real money movement, or a real
production database is listed here. Each item is a **manual** acceptance check,
performed by a person, against real credentials, after a deploy.

**Every item below is currently PENDING.** This repository was verified with
placeholder values only. Nothing here has been executed against a live service.
A pending item is not a pass, and a green automated suite does not convert one
into a pass.

## Status of this release

| # | Check | Status |
| --- | --- | --- |
| 1 | Clerk production origins and keys | PENDING — no production Clerk instance |
| 2 | Stripe webhook URL and signing secret | PENDING — no production Stripe account |
| 3 | Neon production database and migrations | PENDING — no production database |
| 4 | Seed policy on production | PENDING — no production database |
| 5 | Playwright smoke tests on the system browser | PENDING — hermetic specs pass; auth-redirect specs skip by design |
| 6 | Reduced-motion behaviour | PENDING — needs manual browser inspection |
| 7 | Screenshot regeneration | PENDING — needs a capture run on the release commit |
| 8 | Live purchase, refund, and dispute behaviour | PENDING — needs real checkout |

"PENDING" means *not verified*. Where a check is marked as needing a live host,
a local run of the same code is useful evidence but is not a substitute.

## How to record a result

Change the status cell to `PASS` or `FAIL`, and add a line under the check with
the date, the environment, and the commit SHA. A pass with no environment and
no SHA is not a result; it is an opinion.

Never paste a live key, a webhook signing secret, a connection string, a card
number, or a customer identifier into this file. Reference the dashboard or the
secret store instead.

---

## 1. Clerk production origins and keys — PENDING

**Why it cannot be automated.** Clerk rejects sign-in and sign-up when the
requesting origin is not registered, and the failure appears in Clerk's
dashboard, not in this repository's logs. The publishable key is a browser-side
value: if the wrong one is shipped, the error lands on the user's screen and is
invisible to CI.

### Steps

- [ ] In the Clerk dashboard, open **Instance → Allowed origins** and confirm
      the deployed origin is listed exactly, including scheme and any non-default
      port. `https://` and `http://` are different origins.
- [ ] Confirm the sign-in and sign-up redirect URLs point at the deployed host,
      not at `localhost:3000`.
- [ ] Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to the **production** publishable
      key in the deployment platform. The `pk_test_…` and `pk_live_…` prefixes
      are a reliable eyeball check that the right value was shipped.
- [ ] Set `CLERK_SECRET_KEY` to the matching production secret key. A live
      publishable key with a test secret key fails in a way that looks like a
      network fault.
- [ ] Confirm `CLERK_INITIAL_ADMIN_EMAILS` names the real first admins, and that
      at least one of them exists in Clerk. An explicit Clerk
      `publicMetadata.role` of `admin` or `student` always wins; the env list only
      bootstraps users who have no explicit role. To demote an admin, change their
      Clerk public metadata — removing the email from the env list alone does not
      revoke access.
- [ ] Sign out in a private window, visit a protected route such as
      `/dashboard`, and confirm the redirect lands on the deployed sign-in page
      and returns to the original route after sign-in.
- [ ] Confirm the user-sync webhook has fired at least once: a row exists in
      `users` for a real Clerk account, and its `role` matches the Clerk public
      metadata.

### Failure signatures

| Symptom | Cause |
| --- | --- |
| Clerk sign-in renders on a blank page | Wrong publishable key, or the origin is not allowed |
| "Publishable key not valid" | Test key shipped to production, or vice versa |
| Sign-in succeeds but the app treats the user as signed out | `CLERK_SECRET_KEY` from a different instance than the publishable key |
| `users` table stays empty | Clerk webhook not registered, or signing secret mismatch — see [Deployment](#deployment) |

**Note on the local suite.** The auth-redirect Playwright tests are skipped by
design; see item 5. A skip is not evidence that this item passed.

---

## 2. Stripe webhook URL and signing secret — PENDING

**Why it cannot be automated.** Access is granted by the webhook, not by the
browser redirect. A checkout can complete perfectly and grant nothing, and only
a real `checkout.session.completed` delivery to a real endpoint reveals it. The
signing secret is also the one value that must never appear in a test fixture,
a log line, or this file.

### Steps

- [ ] In Stripe, open **Developers → Webhooks** and confirm the endpoint is
      `https://<deployed-host>/api/webhooks/stripe`.
- [ ] Confirm the endpoint is subscribed to at least
      `checkout.session.completed`, `payment_intent.succeeded`, and
      `charge.refunded`. Also subscribe to `refund.created` / `refund.updated`
      and the `charge.dispute.*` / `dispute.*` families, which
      `src/lib/billing/webhooks.ts` handles.
- [ ] Copy the endpoint's **signing secret** into `STRIPE_WEBHOOK_SECRET` in the
      deployment platform. It is not the account's `sk_live_…` API key; the two
      are confused often, and swapping them fails every delivery.
- [ ] Set `STRIPE_SECRET_KEY` to the live secret key.
- [ ] Set `NEXT_PUBLIC_APP_URL` to the deployed origin, and confirm it matches
      the webhook host character for character. A mismatch sends the customer to
      the wrong host after checkout.
- [ ] Run `stripe listen` locally against a production-mode key only if you
      intend to test with real money; for a local loop use `stripe trigger`
      against a test-mode endpoint. Signature verification is never disabled.
- [ ] Send one signed test event and confirm Stripe reports `2xx`, that
      `checkout.session.completed` returns `200`, and that a bad signature
      returns `400`.
- [ ] Inspect the endpoint's delivery log: no failed deliveries, no retries
      exhausting their budget.

### Failure signatures

| Symptom | Cause |
| --- | --- |
| Customer pays, never gains access | Webhook not registered, or events not subscribed |
| Every delivery returns `400` | `STRIPE_WEBHOOK_SECRET` is the wrong secret, or signature verification was disabled |
| Redirect after checkout goes to the wrong host | `NEXT_PUBLIC_APP_URL` does not match the deployed origin |
| Duplicate purchase rows | Delivery replay; the handler must be idempotent — verify in item 8 |

---

## 3. Neon production database and migrations — PENDING

**Why it cannot be automated.** The build opens no connection during prerender,
so `bun run build` succeeds against a syntactically valid but unreachable
`DATABASE_URL`. A build that passes is not evidence that the production
database is reachable, current, or correct.

### Steps

- [ ] Confirm `DATABASE_URL` in the deployment platform is the Neon **pooled**
      connection string, not the direct one. The direct endpoint does not scale
      with serverless concurrency.
- [ ] Confirm the credentials are scoped to the production project, and that
      the branch is the production branch rather than a preview branch.
- [ ] Run `bun run db:generate` **only if the schema changed in this release**,
      and review the generated SQL before it goes anywhere. `drizzle.config.ts`
      sets `strict: true`, which prompts on destructive statements; it does not
      prevent them.
- [ ] Run `bun run db:migrate` against production as a **separate release step,
      before** the new version starts serving traffic. Migrations that run inside
      an app deploy cannot be ordered against traffic.
- [ ] Record the migration version before and after, and confirm they match what
      the running build expects.
- [ ] Confirm the schema matches the application: `users`, `courses`, `modules`,
      `lessons`, `purchases`, and progress tables all exist with the expected
      columns and constraints.
- [ ] Confirm `EXTERNAL_VIDEO_ALLOWED_HOSTS` (server) and
      `NEXT_PUBLIC_EXTERNAL_VIDEO_ALLOWED_HOSTS` (browser) include the video
      host actually in use, or every `external` lesson embed fails closed. The
      effective allow-list is the union of both variables and the built-in
      provider hosts, so an unset variable is not automatically a blocker for
      YouTube, Vimeo, or Mux references.
- [ ] Confirm automated backups and point-in-time recovery are enabled on the
      production branch, and that a restore has been tested at least once.

### Failure signatures

| Symptom | Cause |
| --- | --- |
| Build passes, every database page errors at runtime | Placeholder or unreachable `DATABASE_URL` |
| `relation does not exist` on a new route | Migrations not applied, or applied after traffic |
| Connection exhausted under load | Direct endpoint used instead of the pooled one |
| Video will not embed | Host missing from `EXTERNAL_VIDEO_ALLOWED_HOSTS` |

---

## 4. Seed policy on production — PENDING

**Why it cannot be automated.** A policy about what must never run cannot be
detected by running the gate; it is detected by confirming the thing is absent.
The seed script uses fixed UUIDs, which makes an accidental production run
immediately visible in the catalogue.

**Policy: `bun run db:seed` must never be run against a production database.**
It is a development and test fixture. Production data arrives through
migrations and through real purchases.

### Steps

- [ ] Confirm no deploy pipeline, CI job, cron, or release script invokes
      `db:seed`, `db:push`, or any `drizzle-kit push` command.
- [ ] Confirm the production deploy role is not able to seed even if a person
      tries. Prefer a role without write access to `scripts/seed.ts`'s tables
      where the platform allows it.
- [ ] Confirm the fixed seed UUIDs are absent from production before real data
      arrives. The catalogue must not show two published courses named like the
      fixtures. `tests/e2e/admin-access.spec.ts` hard-codes course
      `10000000-0000-4000-8000-000000000001`; those IDs are load-bearing and
      must not be regenerated.
- [ ] Confirm real courses created through the admin UI are the only source of
      production content, and that a draft course is not publicly visible.
- [ ] If a seed run ever did touch production, restore from the pre-run backup
      rather than deleting rows by hand.

---

## 5. Playwright smoke tests on the system browser — PENDING

**Why it cannot be automated.** This is a manual check in the sense that the
result must be *read*, not merely that a command exits zero. The suite is
gated, and a skip is not a pass.

The suite drives the **system** Chrome/Chromium resolved by
`scripts/system-chrome.ts`; this repository vendors no Playwright browser
download. When no system browser resolves, the browser-dependent tests skip
with an explicit reason instead of reporting a pass they did not earn.

### Steps

- [ ] On the machine that will host the smoke test, confirm a system
      Chrome/Chromium resolves. Set `PLAYWRIGHT_CHROME_EXECUTABLE` or
      `CHROME_PATH` if it does not resolve from a well-known path.
- [ ] Run the full automated gate and record the counts:

      ```bash
      bun run test
      bun run typecheck
      bun run lint
      DATABASE_URL="postgres://placeholder:placeholder@127.0.0.1:5432/placeholder?sslmode=disable" bun run build
      bunx playwright test
      ```

- [ ] Read the Playwright summary. Record the passed, failed, **and skipped**
      counts. Confirm every skip has a stated reason.
- [ ] Confirm the auth-redirect tests in `admin-access.spec.ts`,
      `dashboard-access.spec.ts`, `learning-access.spec.ts`, and the
      "authentication boundaries" block in `error-states.spec.ts` are skipped
      with the `CLERK_E2E_REAL_INSTANCE` reason. They assert Clerk's own
      redirect behaviour, which the harness placeholder key cannot honestly
      measure. **The default run skips them.** That is the intended default,
      not a broken gate, and it is the honest outcome on a machine with no real
      Clerk test tenant.
- [ ] Confirm the public, no-database, and error-state tests **did run** and
      **did pass**. A run where everything skipped is a broken gate, not a
      green one.

#### Running the gated auth-redirect tests for real

This is the opt-in, and it is off unless you turn it on:

| Input | Default | What it does |
| --- | --- | --- |
| `CLERK_E2E_REAL_INSTANCE` | `0` | `1` makes the dev server **inherit** the two real keys below instead of receiving placeholders. |
| `CLERK_SECRET_KEY` | placeholder | Must be a real **test-tenant** secret key when opted in. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | placeholder | Must be the matching real test-tenant publishable key when opted in. |

```bash
CLERK_E2E_REAL_INSTANCE=1 \
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_<real-test-tenant> \
CLERK_SECRET_KEY=sk_test_<real-test-tenant> \
bunx playwright test
```

Behaviour, so there is no ambiguity about what a run meant:

- With `CLERK_E2E_REAL_INSTANCE` unset or `0`, the dev server starts with
  placeholder keys and **no** `DATABASE_URL`. The auth-redirect tests skip with
  a stated reason; nothing real is contacted.
- With `CLERK_E2E_REAL_INSTANCE=1`, the two keys are **inherited from your
  environment**, not re-declared in the dev-server command. A run with `1` and
  a missing key fails immediately with an error naming the key. That is
  deliberate: overriding a real key with a placeholder would run the gated
  tests against the wrong tenant and report Clerk's behaviour as this
  repository's.
- The keys are read from the environment. They are never interpolated into the
  command string, never printed, and never committed.
- `DATABASE_URL` stays unset in **both** modes, so no test reaches a live
  database even in the opted-in run.

**Do not report the auth-redirect tests as passed unless you actually ran them
this way.** An unrun or skipped gate is a skip; recording it as a pass is the
one failure this checklist exists to prevent.

- [ ] Against the deployed host, walk the smoke path in a real browser: land on
      the home page, open the catalogue, open a published course, attempt a
      locked lesson, sign in, and confirm the redirect target.
- [ ] Confirm the deployed build serves no console errors on those pages.

---

## 6. Reduced-motion behaviour — PENDING

**Why it cannot be automated.** The correct outcome is that content is visible
and interactive *without* animation. An automated opacity or visibility
assertion would pass on the animated path too, so it cannot distinguish the two.
This needs eyes on the page.

`src/components/motion/reduced-motion-provider.tsx` reads
`(prefers-reduced-motion: reduce)` through `useSyncExternalStore` and
**subscribes to the media query's `change` event**, so the preference is
tracked live rather than snapshotted once.
`src/components/motion/reveal.tsx` and `src/components/motion/hero-motion.tsx`
both return early when the preference is set, so the animated GSAP timelines
are suppressed while the preference is reduced. Because the update is a
subscription rather than a one-shot read, a page loaded with motion enabled and
then reduced must also settle correctly without a reload. The converse is a
one-way change, not a promise of never animating: if the preference is later
turned off, the effect re-runs and may start the timeline on that next effect
run. A reveal that was suppressed while reduced may therefore animate after the
preference is cleared; that is expected, and the check below is about content
staying visible and interactive either way.

### Steps

- [ ] Enable **Settings → Accessibility → Reduce motion** in the OS (macOS),
      the GNOME accessibility panel, or the Chrome DevTools
      **Rendering → Emulate CSS media feature** option. If you enable it *before*
      loading the page, you are testing the load-time path.
- [ ] Load the landing page. Confirm all hero, section, and card content is
      visible. No element may be left at `opacity: 0`, `y: 18`, or any other
      pre-animation state.
- [ ] Scroll the full page. Confirm nothing that would normally animate in is
      permanently hidden, and that nothing jumps once the animation completes.
- [ ] Confirm all content remains interactive: navigation, catalogue links,
      buttons, and accordions all respond.
- [ ] Check the same pages with motion enabled. Confirm the animation still
      runs, so the fix has not simply disabled the effect for everyone.
- [ ] Confirm the change is live rather than load-time only: with the page
      already open, toggle the OS/DevTools preference **without reloading** and
      confirm the page responds — the provider subscribes to the media query's
      `change` event, so a late change must be picked up rather than requiring a
      refresh. Test both directions (enable → disable and disable → enable) on
      the same loaded page, and confirm that turning motion back on either
      replays the effect or leaves it settled — it must never leave content
      hidden.
- [ ] Confirm no content is stranded mid-transition when the preference flips
      while a reveal is still pending: a page must not end up with a permanently
      hidden section because an animation was interrupted rather than
      completed.
- [ ] Confirm the lesson video player also behaves: autoplay and animated
      transitions must not fight the preference.

---

## 7. Screenshot regeneration — PENDING

**Why it cannot be automated.** The committed images in `docs/screenshots/` are
review artifacts. Regenerating them is a judgement call about whether the
visual change is intended, and reviewing that change is a human act.

`bun run screenshots:capture` uses a fixed viewport, `deviceScaleFactor: 1`,
and reduced motion, so two runs on the same commit differ only by content that
actually changed. It writes a PNG only for a page that actually rendered; a
non-2xx status, a failed navigation, or a missing expected heading is reported
as `skipped` with a reason and no file is written. Pages behind authentication
are never screenshotted.

### Steps

- [ ] Run the capture on the release commit:

      ```bash
      bun run screenshots:capture
      ```

- [ ] Read `docs/screenshots/report.json`. Every entry in `skipped` must have a
      reason you understand. A new skip that you did not expect is a regression,
      not a nuisance.
- [ ] Confirm the commit produces no unrelated churn in `docs/screenshots/`:
      run it twice and confirm the second run is byte-identical. If it is not,
      the capture is not deterministic and the images are not reviewable.
- [ ] Open each changed image and confirm it reflects the change being
      released. Delete images whose pages no longer exist.
- [ ] Confirm no authenticated page produced an image. A screenshot of a
      protected page means the skip list regressed.
- [ ] Run the screenshot spec as part of item 5 and confirm it passed rather
      than skipped.
- [ ] Note that the capture starts its own dev server on port `3010` and has no
      flag to reuse an existing one. Stop whatever is using that port first.

---

## 8. Live purchase, refund, and dispute behaviour — PENDING

**Why it cannot be automated.** This is money and access control. Only a real
Stripe round-trip against a real tenant proves the webhook is registered, the
signing secret matches, and the entitlement state machine is correct. Every
other check in this file is cheaper, so this is the one that cannot be skipped.

The full signed-in walkthrough also covers the manual integration checks from
the release plan; record each one separately.

### Checkout and grant

- [ ] Sign in as a real test user with no purchase for course *X*. Start
      checkout. Confirm the Stripe-hosted page loads, the **amount and price ID
      come from the database row**, and the customer cannot choose what they are
      charged.
- [ ] Complete the payment. Confirm Stripe reports `2xx` to the browser, and
      that `NEXT_PUBLIC_APP_URL` returns the customer to the right host.
- [ ] Confirm the entitlement arrives from the **webhook**, not from the
      redirect. Redeploy nothing; watch the endpoint's delivery log and confirm
      `checkout.session.completed` was delivered and processed.
- [ ] Confirm the purchase row exists with status `paid` and that course *X* is
      now accessible. Access granted only by the redirect is a defect.
- [ ] Confirm a course the user has **not** purchased remains locked.
- [ ] **Replay the same webhook event.** Confirm no duplicate purchase row is
      created and no double-grant occurs. The handler must be idempotent.
- [ ] Deliver the event **twice in a row** with a short gap, as Stripe would on
      a timeout retry. Confirm the result is identical.
- [ ] Confirm the purchased course appears in the dashboard.

### Refund and revoke

- [ ] Issue a refund through the Stripe dashboard. Confirm the corresponding
      event is received, the purchase moves to `refunded`, and the learning
      route **blocks** again without a redeploy.
- [ ] Confirm the refund is honoured for both `charge.refunded` and the
      `refund.created` / `refund.updated` families; subscribing to only one
      leaves a path where access survives a refund.
- [ ] Confirm a **failed or pending** refund does not revoke access, and does
      not grant it either. Intermediate states must not be treated as paid.

### Dispute

- [ ] Open a dispute against the payment. Confirm `charge.dispute.created`
      (or the `dispute.*` family) is received and the entitlement is `revoked`
      — the learning route blocks immediately.
- [ ] Close the dispute as **lost**. Confirm access stays revoked.
- [ ] Close a second dispute as **won**. Confirm the purchase returns to
      `paid` and access is restored. The `dispute.closed` + `status === "won"`
      path is easy to get wrong in one direction and must be checked in both.

### Role and content boundaries

- [ ] As a **student**, attempt to invoke an admin server action directly
      (craft the request; the UI is not the boundary). Confirm it is rejected
      server-side, not merely hidden in the interface.
- [ ] Confirm a **published** course appears in the catalogue and a **draft**
      course does not, in the catalogue, in search, and by direct URL.
- [ ] Watch a lesson to 90%. Confirm the lesson completes and the dashboard
      progress updates without a reload. The stored metric is
      **furthest validated playback position / canonical duration**, not
      accumulated unique watch time, so a seek to the end reports the same
      number as a full watch and **seeks can over-report**. The gate is safe
      but approximate: it is a floor for "reached the end region", not evidence
      of comprehension. Do not build grading, certificates, or time-spent
      reporting on this column without replacing it. See
      [architecture](architecture.md#the-video-progress-metric).
- [ ] Confirm the refund and dispute paths never leave a half-written purchase
      row: each event either applies fully or rolls back.

### Failure signatures

| Symptom | Cause |
| --- | --- |
| Paid, no access, no webhook delivery | Endpoint not registered, or events not subscribed |
| Access survives a refund | Refund event family not subscribed, or not handled |
| Duplicate purchase rows | Non-idempotent handler — a release blocker |
| Student reaches an admin action | Guard checked in the UI instead of the server |
| Draft course visible by direct URL | Route guard missing, not just a filter |

---

## What the automated suite does and does not prove

`bun run test`, `bun run typecheck`, `bun run lint`, `bun run build`, and
`bunx playwright test` all run with placeholder credentials and no database.
That is deliberate: a hermetic gate is fast and its failures are real. It also
means a green gate says nothing about any item above.

Concretely, the automated suite does **not** prove that Clerk allows the
production origin, that the Stripe webhook is registered, that migrations were
applied, that the seed never touched production, that content is visible under
reduced motion, that the screenshots reflect this release, or that a real
payment grants and revokes access correctly.

Treat the eight items above as the release gate, and the automated suite as the
fast pre-gate.

## Next

- [Deployment](deployment.md) — the build, environment, and migration procedure
- [Authentication and billing](authentication-and-billing.md) — sessions, roles, and the webhook state machine
- [Troubleshooting](troubleshooting.md) — symptom-first fixes
- [Database](database.md) — schema and migration rules
