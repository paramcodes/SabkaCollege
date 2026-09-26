---
title: "Deployment"
description: "Build, environment, migrations, webhooks, and the honest limitations of the screenshot pipeline."
slug: "deployment"
publishedAt: "2026-03-02"
readingTime: "8 min read"
tags: ["deployment", "operations", "screenshots"]
---

## Purpose

Cover what has to be true before a deploy is safe, how the webhook endpoints
are registered, and how documentation screenshots are produced without
fabricating authenticated pages.

## Build requirements

| Requirement | Reason |
| --- | --- |
| `DATABASE_URL` | `src/db/index.ts` throws at module load without it. Database-backed routes import it during prerender |
| `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk needs both at build time for the sign-in and sign-up routes |
| `STRIPE_SECRET_KEY` | Imported by the billing layer, which the catalogue imports |
| Node 22 or newer | Next.js 16 toolchain |

A build with placeholders is useful for verification and is **not** something to
deploy. `bun run build` succeeds with a syntactically valid but unreachable
`DATABASE_URL` because no connection is opened during prerender. Omitting
`DATABASE_URL` entirely is not an option: the build fails while collecting page
data for `/admin` with `Failed to collect page data for /admin`.

### Build warnings

A successful build emits two Turbopack warnings, both from the same cause:

```
./src/lib/content/collection.ts:53:19
./src/lib/content/collection.ts:57:9
Warning: Dynamic filesystem access causes tracing of the whole project
```

`resolveContentDirectory` probes `process.cwd()` and the module directory to
find `docs/blog` and `docs/guides`, and static analysis cannot see that the
result is a fixed content subdirectory. The warnings are expected for the
content loader; they do not fail the build.

## Build and run

```bash
bun install --frozen-lockfile
bun run build
bun run start
```

Use `--frozen-lockfile` in CI. If the lockfile needs updating, that is a change
to review, not something the build should do silently.

## Environment variables

See the full table in
[authentication and billing](#authentication-and-billing). Classify them:

| Scope | Variables |
| --- | --- |
| Server only | `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, `CLERK_INITIAL_ADMIN_EMAILS`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `EXTERNAL_VIDEO_ALLOWED_HOSTS` |
| Exposed to the browser | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_EXTERNAL_VIDEO_ALLOWED_HOSTS` |

A `NEXT_PUBLIC_` value is shipped to every visitor. Never put a secret behind
that prefix.

## Migrations

Run migrations **before** the new version serves traffic, as a separate release
step:

```bash
bun run db:generate   # only when the schema changed, and commit the SQL
bun run db:migrate
```

`bun run db:push` is a local convenience. It produces no migration file, so it
cannot be reviewed or replayed in another environment.

Review generated SQL before applying it. `drizzle.config.ts` sets
`strict: true`, which prompts on destructive changes but does not prevent them.

## Webhook registration

Both endpoints must be reachable from the public internet and must use HTTPS.

| Endpoint | Provider | Configured with |
| --- | --- | --- |
| `/api/webhooks/stripe` | Stripe | `STRIPE_WEBHOOK_SECRET` from the endpoint's signing secret |
| `/api/webhooks/clerk` | Clerk | `CLERK_WEBHOOK_SIGNING_SECRET` from the Clerk dashboard |

Register the endpoint's host as `NEXT_PUBLIC_APP_URL` so the checkout redirect
URLs match. A mismatch there produces redirects to the wrong origin.

For local testing, point Stripe at a tunnel rather than disabling signature
verification. The Stripe CLI can forward events, but the signature check must
stay enabled in the route.

### Events to subscribe to

| Provider | Events |
| --- | --- |
| Stripe | `checkout.session.completed`, `payment_intent.succeeded`, `charge.refunded`, and any event your mapping in `src/lib/billing/webhooks.ts` handles |
| Clerk | `user.created`, `user.updated`, `user.deleted` |

Clerk events the route does not handle still return 200 on purpose. A non-2xx
makes Clerk retry an event you will never act on.

## Post-deploy checks

1. `/` renders the marketing page.
2. `/blog` and `/docs` render the Markdown content. These are the cheapest
   signal that the build packaged the `docs/` directories correctly.
3. `/courses` renders either the catalogue or its explicit unavailable state.
   Both are acceptable; a 500 is not.
4. `/dashboard` and `/admin` redirect to sign-in.
5. A real purchase completes and grants access. This is the only check that
   proves the webhook is registered and the signing secret matches.

## Documentation screenshots

`scripts/capture-docs-screenshots.ts` produces the images under
`docs/screenshots/`. The five public screenshots are mirrored into
`public/docs/screenshots/`, so the running app serves them at
`/docs/screenshots/<file>.png`. It is a documentation tool, not a test, and it has no
command-line flags. The only inputs are the environment variables the browser
resolver reads.

### How it runs

1. It resolves the **system** Chrome through `scripts/system-chrome.ts`. If
   none is found it writes a message and exits non-zero without producing any
   image.
2. It starts `bun run dev` on `127.0.0.1:3010` with an **allow-listed**
   environment: `PATH`, `HOME`, `NODE_ENV=development`,
   `NEXT_TELEMETRY_DISABLED=1`, a placeholder `CLERK_SECRET_KEY`, and a
   placeholder `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
3. It deliberately sets **no `DATABASE_URL`**, and it does not spread
   `process.env` into the child. A real `DATABASE_URL`, `CLERK_SECRET_KEY`, or
   `STRIPE_SECRET_KEY` in your shell cannot leak into the capture run.
4. It waits for the server to answer, then drives the browser through a fixed
   list of public routes at 1440x900, `deviceScaleFactor: 1`, and
   `reducedMotion: "reduce"`, with CSS animation frozen.
5. It writes the PNGs and `docs/screenshots/report.json`. It writes **no
   `README.md`**.
6. It always stops the dev server it started, including on failure, escalating
   to `SIGKILL` after 10 seconds.

### Browser resolution

This repository does not vendor a Playwright browser download, so there is no
bundled-Chromium fallback. `scripts/system-chrome.ts` is the single place that
decides whether a browser is available, and it is shared by the screenshot
script, `playwright.config.ts`, and `tests/e2e/screenshots.spec.ts`. It
resolves in this order:

1. `PLAYWRIGHT_CHROME_EXECUTABLE`, if it points at an executable file.
2. `CHROME_PATH`, same check.
3. A fixed list of well-known install locations, including
   `/usr/bin/google-chrome`, `/usr/bin/google-chrome-stable`,
   `/opt/google/chrome/chrome`, `/usr/bin/chromium`,
   `/usr/bin/chromium-browser`, `/snap/bin/chromium`, and the macOS
   application bundles.

A candidate must be a real, executable file. A dangling symlink, a directory,
or a non-executable stub is skipped, and resolution continues to the next
candidate. If nothing qualifies the resolver returns `null`.

### What it captures and what it does not

| File | Route | Outcome |
| --- | --- | --- |
| `landing-page.png` | `/` | Captured |
| `pricing-page.png` | `/pricing` | Captured |
| `courses-page.png` | `/courses` | Captured, showing the no-database empty state |
| `blog-page.png` | `/blog` | Captured |
| `docs-page.png` | `/docs` | Captured |

Five files per run, and no others. These routes are **never captured** and no
file is written for them:

| Route | Reason recorded in the report |
| --- | --- |
| `/dashboard` | Requires a signed-in Clerk session |
| `/admin` | Requires a signed-in Clerk session and an admin role |
| `/sign-in`, `/sign-up` | Clerk-hosted auth screens render third-party UI and need a real tenant |
| `/courses/[courseSlug]`, `/courses/[courseSlug]/preview/[lessonSlug]` | Need a live database row for a published course and lesson |

A target that fails at run time — a non-2xx response, a failed navigation, or a
page that renders without its expected heading — is reported as `skipped` with
the reason, and no file is written. The script never writes a screenshot of a
sign-in page under the name of a protected page.

Because no `DATABASE_URL` is set, `/courses` renders its documented empty
state. That image is honest and useful, but it is **not** the populated
catalogue. The report records this with a `note` field on the captured entry.

### Running it

```bash
bun run screenshots:capture
```

The port, viewport, output directory, and route list are fixed constants in the
script. There is no flag to change them, and there is no flag to point the run
at an already-running server.

The report is the source of truth for what a run produced. Read
`docs/screenshots/report.json` after every run rather than assuming a set.

## Limitations of the screenshot pipeline

- No authenticated page is captured. Five images are written per run, and the
  protected and database-dependent routes are absent by design.
  `docs/screenshots/README.md` says exactly why.
- The script does not use a real Stripe or Clerk account, so purchase and
  dashboard screenshots require a separate manual pass.
- Images are captured at a single 1440x900 viewport. There is no responsive
  set.
- Animation and video do not play in the captures. CSS animation is frozen
  before the shot, so reveal animations sit at their resting state.
- The run deliberately omits `DATABASE_URL`, so catalogue images show the
  no-database state, not real data.
- Content behind authentication is documented from the route and its guard,
  not from a captured image.

## Safe-change steps

**Adding a screenshot**

1. Add it to `CAPTURED_TARGETS` in `scripts/capture-docs-screenshots.ts` with
   its `expectText`, so a page that renders blank is reported rather than
   written.
2. If the page is protected or needs live data, add it to `SKIPPED_TARGETS`
   with the reason. Do not attempt to authenticate.
3. Reference the file from the relevant guide using a site-absolute path.
4. Recapture and commit the PNG together with the updated
   `docs/screenshots/report.json` and `docs/screenshots/README.md`.

**Changing the build**

1. Run the full gate: `bun run test`, `bun run typecheck`, `bun run lint`, and a
   build.
2. Check that no new secret entered the diff: `git diff | grep -i -E "sk_|pk_|whsec_|postgres://[^u]"`.
3. Commit. Do not push without an explicit request.

## Verification commands

```bash
bun run test
bun run typecheck
bun run lint
DATABASE_URL="postgres://placeholder:placeholder@127.0.0.1:5432/placeholder?sslmode=disable" \
  CLERK_SECRET_KEY=sk_test_placeholder \
  bun run build
bunx playwright test
bun run screenshots:capture
```

## Troubleshooting

**The build fails with a DATABASE_URL error.** Pass the variable on the command
line. A placeholder is enough for verification. Without it the build fails
while collecting page data for `/admin`.

**The script cannot find a browser.** It looks only for a system
Chrome/Chromium. Install one at a well-known path, or set
`PLAYWRIGHT_CHROME_EXECUTABLE` or `CHROME_PATH` at an existing executable.
There is no bundled-Chromium fallback in this repository.

**The script cannot start the dev server.** Port 3010 is in use. The script
starts its own server and has no flag to reuse an existing one, so stop the
other process.

**The dev server exits during capture.** The placeholder Clerk values are
sufficient for the public pages. The output of the failed server is printed,
so read the error before assuming a browser problem.

**A screenshot is blank or missing.** Check `docs/screenshots/report.json`
first. A target listed under `skipped` has a reason: a non-2xx status, a
failed navigation, or a page that rendered without its expected heading.

**A protected page redirected to sign-in.** Expected. That page belongs in
`SKIPPED_TARGETS` and must never produce an image.

## Next

- [Authentication and billing](#authentication-and-billing)
- [Page map](#page-map)
- [Troubleshooting](#troubleshooting)
