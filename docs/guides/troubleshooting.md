---
title: "Troubleshooting"
description: "A symptom-first reference for the failures you are most likely to hit, with the actual cause and the actual fix."
slug: "troubleshooting"
publishedAt: "2026-03-02"
readingTime: "10 min read"
tags: ["troubleshooting", "reference"]
---

## Purpose

Fix things quickly. Start from the symptom, confirm the cause, then apply the
fix. Each entry names the file that produces the behaviour so you are not
grepping.

## Build and typecheck

**`DATABASE_URL is required to create the database client.`**
`src/db/index.ts` throws at module load. The variable is unset in the process
that imported it. Pages that must survive this check the variable before the
import. For a one-off build, pass it on the command line:
`DATABASE_URL="postgres://user:pass@host/db?sslmode=require" bun run build`.

**A cache directive error during `next build`.**
Read the directive named in the message. `"use cache: private"` cannot be
stacked with `"use cache"`, and neither works in a non-async function. Details
in [architecture](#architecture).

**A prerender error about dynamic data in a static route.**
Something in the static path reads `cookies()`, `headers()`, or `searchParams`.
Either pass the value in as an argument from outside the cached scope, or add
`await connection()` and accept a dynamic route.

**A page renders the unavailable state permanently in production.**
`connection()` was called inside the `try/catch` that renders the fallback, so
its throw was swallowed and the page prerendered a permanent error. Move
`connection()` above the `try`.

**`.next/types` typecheck errors on a fresh clone.**
Run `bun run dev` or a build once so Next generates its route types. That
directory is generated, not checked in.

## Content and Markdown

**`next build` fails with `ContentValidationError`.**
A file in `docs/blog` or `docs/guides` has invalid frontmatter. The message
names the file and every issue in it. Common causes: a missing `---` on the
first line, an unclosed frontmatter block, an unknown key, a slug with an
uppercase letter or a double hyphen, a `publishedAt` that is not a real
`YYYY-MM-DD` date such as `2026-02-30`, and `tags` as a scalar instead of a
list.

**"duplicate slug" during build.**
Two files in the same directory declare the same `slug`. The URL comes from
frontmatter, not the file name. Collections are independent, so
`docs/blog/getting-started.md` and `docs/guides/getting-started.md` may share a
slug; two files inside `docs/guides` may not.

**Raw HTML in a guide renders as visible text.**
`renderMarkdown` escapes before it emits. This is the security model, not a bug.
It supports headings, paragraphs, fenced code, blockquotes, ordered and
unordered lists, thematic breaks, links, images, and inline emphasis only.

**A link renders as plain text.**
`safeHref` allows in-page anchors, site-absolute paths without `..`, and
`https://` URLs. `http://`, `javascript:`, `data:`, and protocol-relative
`//host` are rejected by design.

**A `/blog/<slug>` URL 404s for a file that exists.**
The URL uses the `slug` from frontmatter, not the file name.

## Authentication

**A signed-in user has no `users` row.**
`getCurrentAppUser` upserts on every request, so this means the sync threw.
Check `DATABASE_URL`, and check the Clerk user has a primary email —
`getRequiredEmail` rejects an account with no email address.

**A user is admin in Clerk but `/admin` redirects to sign-in.**
The mirror has not synced. Confirm the email is in `CLERK_INITIAL_ADMIN_EMAILS`
if the grant must survive a full resync, then reload so the request re-syncs.
Never write `users.role` directly; the next sync overwrites it.

**A protected route renders instead of redirecting.**
The prefix is missing from the `matcher` in `proxy.ts`, or the layout guard is
missing. A page guard alone does not redirect — `/learn` deliberately prompts
in place instead.

**`auth.protect()` redirects in a context where it should not.**
The matcher in `proxy.ts` is the only thing that scopes middleware. Widening it
applies `auth.protect()` to routes that should stay public.

## Billing

**Checkout does not start.**
In order: is the user signed in, is the course `published`, is `stripePriceId`
set, and is `NEXT_PUBLIC_APP_URL` set? Each failure throws a distinct message
server-side; the UI shows generic copy on purpose.

**A payment completed but access was never granted.**
Check the Stripe webhook delivery log. A 500 means `handleStripeEvent` threw
and Stripe will retry. A 400 means the signature check failed, which usually
means `STRIPE_WEBHOOK_SECRET` does not match the registered endpoint.

**Webhook verification fails only in production.**
The endpoint is registered against a different signing secret. Re-copy it. Do
not disable verification.

**Duplicate purchases appear in `/admin/purchases`.**
`purchases.stripePaymentIntentId` is unique, so a genuine duplicate means a row
was written outside the webhook path. Look for a direct insert in a server
action.

**A refund does not revoke access.**
`nextPurchaseStatus` is monotonic, so a `refunded` incoming event does apply.
If access persists, confirm the webhook arrived and that the payment intent IDs
match the `purchases` row.

## Video and lessons

**A lesson saves but no player renders.**
`getVideoEmbedUrl` returned `null`. For YouTube the reference must be 6 to 20
word characters, not a full URL. For `vimeo`, 6 to 12 digits. For `mux`, 8 to
128 word characters. For `cloudflare_stream`, an `https` URL on
`*.cloudflarestream.com`. For `external`, an `https` URL on an allow-listed
host with no credentials and no port.

**A preview URL 404s for a lesson that exists.**
All three of these produce the same result on purpose: the course is not
`published`, `isPreview` is false, or the lesson belongs to a different course.

**Lesson creation fails with a unique violation.**
Lesson slugs are globally unique, not unique per module, because they appear in
the public preview URL.

## Admin content

**"Check the course details and try again."**
The `INVALID_INPUT` code, with a deliberately generic message. Check the slug
pattern, that `priceAmount` is an integer, that `currency` is three letters, and
that `coverImageUrl` is a full URL.

**"The course is not ready to publish."**
The `NOT_READY` code. You need a positive price, a Stripe product and price, at
least one module, and at least one lesson with a usable video reference.

**"The course was saved, but the page could not be refreshed."**
`CACHE_ERROR`. The write committed and the revalidation threw. Reload and
re-save. If it recurs, compare the `cacheTag` calls in
`src/db/queries/courses.ts` with the `revalidateTag` calls in
`src/actions/admin-courses.ts` — a mismatch means a stale page forever.

**A published course is not on `/courses`.**
Confirm the status is `published` and not `archived`. If the catalogue is still
stale, the revalidation failed; reload `/admin` to force a re-render, then
re-save.

## Tests

**`bun test` and `bun run test` give different results.**
`bun run test` is the project suite (Vitest) and is the command to use. `bun
test` is Bun's own runner and can silently skip the Vitest configuration. To run
a single file, pass it after `--`: `bun run test -- tests/unit/auth/roles.test.ts`.
`bunfig.toml` excludes `tests/e2e/**`.

**A Playwright test fails to launch a browser.**
Playwright's bundled Chromium may not be downloaded. The `chromium` project in
`playwright.config.ts` falls back to the system Chrome at `/usr/bin/google-chrome`
when it is present. If neither is available, the tests cannot run — install one
rather than removing the test.

**A Playwright test times out on `webServer`.**
The dev server in `playwright.config.ts` starts with placeholder Clerk values
and no `DATABASE_URL`, so the protected routes are expected to redirect. If the
server did not start, the port is in use or `.env.local` is missing.

**Vitest picks up an e2e spec.**
Check `tests/unit/**/*.test.ts` is still the include glob in `vitest.config.ts`.

## Lint and formatting

**`bun run lint` reports a hook rule error you did not introduce.**
Run lint on a clean tree first. Rule behaviour changes between ESLint and
`eslint-config-next` versions, and `bun.lock` records which is installed.

**An import-order or unused-import error appears in a generated file.**
Check the file is actually in the project. Files under `.next/` are generated
and are not linted.

## Environment

**A variable is set in my shell but not in the app.**
`bun run dev` reads `.env.local` plus the process environment. `env -u VAR`
and CI-specific invocations can remove a variable you expect to be there. Check
the process, not the shell.

**Port 3000 is in use.**
`bun run dev -- --port 3001`, and update the `baseURL` in
`playwright.config.ts` to match, or your e2e run will test nothing.

## When you cannot reproduce it

1. `git status` and `git diff` — is the working tree what you think it is?
2. `bun run test`, `bun run typecheck`, `bun run lint` on a clean tree. A
   failing baseline invalidates any reproduction.
3. `bun run build` with a placeholder `DATABASE_URL`. A problem that only
   appears in the build is usually a cache directive or a prerender boundary.
4. Search the app for the exact user-facing string. Every error state has one
   source, and grepping for it finds the component that renders it.

## Next

- [Architecture](#architecture)
- [Database](#database)
- [Components](#components)
- [Deployment](#deployment)
