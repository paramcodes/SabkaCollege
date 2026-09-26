---
title: "Authentication and billing"
description: "Clerk sessions, user mirroring, role guards, Stripe Checkout, and the webhook rules that keep access correct."
slug: "authentication-and-billing"
publishedAt: "2026-03-02"
readingTime: "9 min read"
tags: ["clerk", "stripe", "auth", "billing"]
---

## Purpose

Explain how identity becomes an app user, how that user gets access to a
course, and which parts must never be skipped or reordered.

## Identity: Clerk owns it, Postgres mirrors it

Clerk owns authentication, sessions, and role metadata. The `users` table in
Postgres is a mirror. There is no password, no session row, and no second
identifier.

| Concern | Owner |
| --- | --- |
| Credentials, sessions, MFA | Clerk |
| User ID, email, name, avatar | Clerk, mirrored to `users` |
| Role (`student` or `admin`) | Clerk public metadata, mirrored to `users` |
| Purchases and progress | Postgres only |

### Middleware

`proxy.ts` wraps `clerkMiddleware` and calls `auth.protect()` for `/dashboard`,
`/learn`, and `/admin`. That is the network-level gate: an unauthenticated
request never reaches the page.

### Page-level guards

Middleware is not sufficient on its own, so every page also calls a guard from
`src/lib/auth/guards.ts`:

| Guard | Throws when |
| --- | --- |
| `requireUser` | There is no signed-in user |
| `requireAdmin` | No user, or `user.role !== "admin"` |

The two failure messages are distinct on purpose: `"Authentication required"`
vs `"Admin access required"`. `createAdminCourseActions` maps the first to
`UNAUTHENTICATED` and the second to `FORBIDDEN`, so the UI can say the right
thing without inspecting a stack trace.

`app/(admin)/admin/layout.tsx` catches either throw and redirects to
`/sign-in?redirect_url=%2Fadmin`. All six admin routes inherit that, which is
why they all fail closed identically.

### User synchronisation

`src/lib/auth/user-sync.ts` has two entry points:

- `syncCurrentClerkUser(user)` — called from `getCurrentAppUser()`. Upserts the
  signed-in user on the way past, so a first-time visitor gets a row before
  anything else needs one.
- `syncClerkUser(event)` — called from the Clerk webhook for create, update, and
  delete events. Deletion writes a tombstone rather than removing the row,
  because `purchases.user_id` and `lesson_progress.user_id` reference it.

Both go through `buildAppUserSyncValues` in `src/lib/validation/user.ts`, which
is a pure function and is unit-tested in `tests/unit/auth/user-sync.test.ts`.

### Admin promotion

`CLERK_INITIAL_ADMIN_EMAILS` is a comma-separated allow-list applied at sync
time. Granting admin means setting the Clerk `publicMetadata.role`, which then
flows into `users.role` on the next sync. Never write `users.role` directly:
the next sync overwrites it.

## Access: a paid purchase is the only grant

```ts
canAccessPurchase(status) === status === "paid"
```

`hasCourseAccess(userId, courseId)` in `src/lib/billing/entitlements.ts` checks
for a matching row in `purchases` with `status = 'paid'`. There is no separate
entitlement table, no flag on the user, and no time-based expiry.

Access is deliberately re-checked on the lesson route. The route reads
`getCourseLearningView(courseSlug, user.id)`, which joins purchases, modules,
lessons, and progress in one query so the page never has to decide access and
content separately.

## Purchase: Stripe Checkout

```
app/(catalog)/courses/[courseSlug]/page.tsx   [server]
  -> PurchaseCard                            ["use client"]
  -> src/actions/billing.ts                  ["use server"]
       -> requireUser()                       [ throws if signed out ]
       -> createCourseCheckout({ courseSlug, userId })
            -> SELECT course WHERE slug = ? AND status = 'published'
            -> SELECT user   WHERE id = ?
            -> throw if course.stripePriceId is null
            -> stripe.checkout.sessions.create({
                   mode: "payment",
                   line_items: [{ price: stripePriceId, quantity: 1 }],
                   metadata: { clerkUserId, courseId, courseSlug },
                   success_url: <app>/learn/<courseSlug>?checkout=success,
                   cancel_url:  <app>/courses/<courseSlug>?checkout=cancelled
                 })
```

The customer email is prefilled from the mirrored `users` row. The course's
`stripeProductId` and `stripePriceId` are read from the database, never from the
form, so a client cannot choose what it is charged.

`NEXT_PUBLIC_APP_URL` builds the redirect URLs. Without it,
`createCourseCheckout` throws `"Application URL is not configured"` before
calling Stripe.

## Webhooks: the only trustworthy grant

A redirect back from Stripe proves nothing. Access comes from the webhook.

```
POST /api/webhooks/stripe
  -> read stripe-signature header
  -> await request.text()                    [ raw body, never .json() ]
  -> stripe.webhooks.constructEventAsync(rawBody, signature, secret)
  -> mapStripeEventToPurchase(event)
  -> handleStripeEvent(purchaseEvent)
       -> idempotent on purchases.stripePaymentIntentId (unique)
       -> nextPurchaseStatus(current, incoming)  [ monotonic ]
```

### Three rules

1. **Verify against the raw body.** The route calls `request.text()` before any
   parsing. Refactoring it to `request.json()` breaks verification, and Stripe
   will simply stop delivering events.
2. **Idempotency comes from the schema.** `purchases.stripe_payment_intent_id`
   is unique. Stripe retries webhooks, so the handler must tolerate the same
   event twice; the constraint plus the upsert is what makes that safe.
3. **Status only moves forward.** `nextPurchaseStatus` in
   `src/lib/billing/entitlements.ts` implements the transitions:

   | Current | Incoming | Result |
   | --- | --- | --- |
   | `revoked` | anything | `revoked` |
   | anything | `revoked` | `revoked` |
   | `refunded` | anything | `refunded` |
   | `paid` | `pending` | `paid` |
   | otherwise | incoming | incoming |

   A late `pending` event can never downgrade a `paid` purchase. This is
   tested in `tests/unit/billing/webhook-idempotency.test.ts`.

### Clerk webhook

`POST /api/webhooks/clerk` calls `verifyWebhook(request)` from
`@clerk/nextjs/webhooks`, which reads `CLERK_WEBHOOK_SIGNING_SECRET`. It
handles only user create, update, and delete events and ignores the rest with a
200. Returning 200 for an ignored event is deliberate: a non-2xx makes Clerk
retry an event you will never handle.

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | server | Neon connection string |
| `CLERK_SECRET_KEY` | server | Clerk backend API |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | both | Clerk frontend key |
| `CLERK_WEBHOOK_SIGNING_SECRET` | server | Verifies Clerk events |
| `CLERK_INITIAL_ADMIN_EMAILS` | server | Comma-separated admin allow-list |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | both | Defaults to `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | both | Defaults to `/sign-up` |
| `STRIPE_SECRET_KEY` | server | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | server | Verifies Stripe events |
| `NEXT_PUBLIC_APP_URL` | both | Absolute origin for redirects |

`.env.example` lists all of them. `.env.local` is gitignored. Never commit a
real value, and never paste one into a guide, a test, or a Playwright command
line.

## Safe-change steps

**Granting admin access to someone**

1. Set `publicMetadata.role = "admin"` on the Clerk user.
2. Confirm the email is in `CLERK_INITIAL_ADMIN_EMAILS` if the grant is meant to
   survive a full resync.
3. Have them reload. The next sync writes `users.role`.
4. Verify at `/admin` — the layout redirects to sign-in if the role did not
   land.

**Adding a new webhook event**

1. Extend the mapping in `src/lib/billing/webhooks.ts` only. Do not read the
   event inline in the route.
2. Decide the status transition explicitly and add a row to `nextPurchaseStatus`.
3. Add a case to `tests/unit/billing/webhook-validation.test.ts` and
   `webhook-idempotency.test.ts`.
4. Re-deliver the event from the Stripe dashboard and confirm the purchase row
   did not duplicate.

**Changing access rules**

The single definition is `canAccessPurchase` and the query behind
`hasCourseAccess`. Change it there. Do not add a second check somewhere else —
two checks will eventually disagree, and the disagreement becomes an access
bug.

## Verification commands

```bash
bun run test tests/unit/auth tests/unit/billing
bun run typecheck
bun run lint
bunx playwright test tests/e2e/admin-access.spec.ts tests/e2e/learning-access.spec.ts
```

The access specs run without credentials. They assert that signed-out requests
land on sign-in and that no protected copy leaks.

## Troubleshooting

**A signed-in user has no `users` row.** `getCurrentAppUser` upserts on every
request, so this means the sync threw. Check that `DATABASE_URL` is present and
that the Clerk user has a primary email — `getRequiredEmail` rejects an account
with no email address.

**A user is admin in Clerk but not in `/admin`.** The mirror has not synced.
Check `CLERK_INITIAL_ADMIN_EMAILS` and reload so the request re-syncs.

**Checkout does not start.** In order: is the user signed in, is the course
`published`, is `stripePriceId` set, and is `NEXT_PUBLIC_APP_URL` set? The
action throws a distinct message for each; the UI shows the generic "temporarily
unavailable" copy on purpose.

**A payment completed but access was never granted.** Check the Stripe webhook
delivery log. A 500 means `handleStripeEvent` threw and Stripe will retry; a 400
means the signature check failed, which usually means `STRIPE_WEBHOOK_SECRET`
does not match the endpoint.

**Refunds do not revoke access.** `nextPurchaseStatus` is monotonic, so a
`refunded` incoming event does apply. If access persists, confirm the webhook
arrived at all and that the payment intent IDs match the `purchases` row — a
mismatch there means the purchase was created from a different payment path.

**Webhook verification fails only in production.** The endpoint is registered
against a different signing secret than the one deployed. Re-copy it from the
Stripe dashboard; do not disable verification.

## Next

- [Database](database.md)
- [Adding a course](adding-a-course.md)
- [Deployment](deployment.md)
