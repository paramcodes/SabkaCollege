---
title: "Page map"
description: "Every route, what guards it, what it reads, and the safe states you can rely on when data is unavailable."
slug: "page-map"
publishedAt: "2026-03-02"
readingTime: "7 min read"
tags: ["routes", "reference"]
---

## Purpose

A single reference of routes, their guards, their data sources, and the state
each one renders when the data store does not answer. Use this before adding a
route or debugging a redirect.

## Public routes

| Route | File | Reads | Unavailable state |
| --- | --- | --- | --- |
| `/` | `app/(marketing)/page.tsx` | Nothing. Static content | Never fails |
| `/pricing` | `app/(marketing)/pricing/page.tsx` | Nothing. Static content | Never fails |
| `/blog` | `app/(content)/blog/page.tsx` | `docs/blog` | Fails the build on bad frontmatter |
| `/blog/[slug]` | `app/(content)/blog/[slug]/page.tsx` | `docs/blog` | `not-found` |
| `/docs` | `app/(docs)/docs/page.tsx` | `docs/guides` | Fails the build on bad frontmatter |
| `/courses` | `app/(catalog)/courses/page.tsx` | `getPublishedCourses` | "Course catalogue is temporarily unavailable" |
| `/courses/[courseSlug]` | `app/(catalog)/courses/[courseSlug]/page.tsx` | `getPublishedCourseBySlug` | "Course temporarily unavailable" |
| `/courses/[courseSlug]/syllabus` | `app/(catalog)/courses/[courseSlug]/syllabus/page.tsx` | `getCourseSyllabus` | Syllabus unavailable state |
| `/courses/[courseSlug]/preview/[lessonSlug]` | `.../preview/[lessonSlug]/page.tsx` | `getPublicPreviewLesson` | "Preview temporarily unavailable" |

These render without a session. The catalogue family checks
`process.env.DATABASE_URL` first and shows an explicit unavailable state rather
than throwing, so the marketing surface survives a database outage.

## Authentication routes

| Route | File | Notes |
| --- | --- | --- |
| `/sign-in` | `app/(auth)/sign-in/[[...sign-in]]/page.tsx` | Clerk catch-all, centred layout |
| `/sign-up` | `app/(auth)/sign-up/[[...sign-up]]/page.tsx` | Clerk catch-all, centred layout |

The `[[...sign-in]]` optional catch-all is required. Clerk needs a catch-all
segment to handle its own sub-routes.

## Protected routes

`proxy.ts` matches `/dashboard`, `/learn`, and `/admin` with `auth.protect()`.
The middleware is a first line of defence, not the only one — every page also
calls a guard, because middleware and layout guards are different failure
points.

| Route | Guard | Fallback on failure |
| --- | --- | --- |
| `/dashboard` | `requireUser` in the page | `proxy.ts` redirects to sign-in |
| `/learn/[courseSlug]` | `requireUser`, then `hasCourseAccess` | Inline sign-in prompt, or a locked state |
| `/learn/[courseSlug]/[lessonSlug]` | `requireUser`, then access check, then `getCourseLearningView` | Inline sign-in prompt, locked state, or `notFound()` |
| `/admin` | `requireAdmin` in `app/(admin)/admin/layout.tsx` | Redirect to `/sign-in?redirect_url=%2Fadmin` |
| `/admin/courses` | Layout guard plus `requireAdmin` in the page | Same |
| `/admin/courses/new` | Layout guard plus `requireAdmin` in the page | Same |
| `/admin/courses/[courseId]/edit` | Layout guard plus `requireAdmin` in the page | Same |
| `/admin/students` | Layout guard plus `requireAdmin` in the page | Same |
| `/admin/purchases` | Layout guard plus `requireAdmin` in the page | Same |

The admin layout redirects rather than rendering an error, so every admin route
fails closed with the same behaviour. `tests/e2e/admin-access.spec.ts` asserts
this for all six admin routes.

## Route handlers

| Route | File | Verifies with | Failure codes |
| --- | --- | --- | --- |
| `POST /api/webhooks/clerk` | `app/api/webhooks/clerk/route.ts` | `verifyWebhook` from `@clerk/nextjs/webhooks` | 400 on bad signature, 200 otherwise |
| `POST /api/webhooks/stripe` | `app/api/webhooks/stripe/route.ts` | `stripe.webhooks.constructEventAsync` against the raw body | 500 unconfigured, 400 bad signature, 500 processing failure |

Both read the **raw** body for verification. If either is ever refactored to
call `request.json()` first, signature verification breaks silently.

## Screenshots and public state

`scripts/capture-docs-screenshots.ts` drives the **system Chrome** through the
public routes at a fixed 1440x900 viewport and writes exactly five PNGs into
`docs/screenshots/` per run:

| File | Route | Captured | Note |
| --- | --- | --- | --- |
| `landing-page.png` | `/` | Yes | — |
| `pricing-page.png` | `/pricing` | Yes | — |
| `courses-page.png` | `/courses` | Yes | The no-database empty state, not real catalogue data |
| `blog-page.png` | `/blog` | Yes | — |
| `docs-page.png` | `/docs` | Yes | — |

The rest of the surface is **never captured**, and the script writes no file
for it:

| Route | Why no image exists |
| --- | --- |
| `/dashboard` | Needs a signed-in Clerk session. No authenticated screenshot is fabricated |
| `/admin` | Needs a signed-in Clerk session and an admin role |
| `/sign-in`, `/sign-up` | Clerk-hosted screens render third-party UI and need a real tenant |
| `/courses/[courseSlug]`, `/courses/[courseSlug]/preview/[lessonSlug]` | Need a live database row for a published course and lesson |
| `/learn/[courseSlug]`, `/learn/[courseSlug]/[lessonSlug]` | Need a signed-in student with a paid purchase |

A route that fails to render is also reported rather than captured: a non-2xx
response, a failed navigation, or a missing expected heading marks the target
`skipped` and writes nothing.

Both lists are written to the machine-readable
`docs/screenshots/report.json`, which is the only machine-written file
alongside the PNGs. The run writes no `README.md`; `docs/screenshots/README.md`
is maintained by hand from that report. See [deployment](deployment.md) for the
browser requirement, the command, and how the honest states are described.

## Safe-change steps

**Adding a public route**

1. Put it in `(marketing)`, `(catalog)`, `(content)`, or `(docs)`.
2. If it reads the database, add the `DATABASE_URL` guard and `connection()`.
3. Add a `loading.tsx` and an `error.tsx` if the route is dynamic.
4. Add its path to the table above in the same commit.

**Adding a protected route**

1. Add the prefix to the `matcher` in `proxy.ts`.
2. Call `requireUser` or `requireAdmin` in the page. Middleware alone is not
   enough.
3. Decide and document the unauthenticated behaviour: redirect or inline
   prompt. `/admin` redirects; `/learn` prompts in place.
4. Add a case to the relevant access spec in `tests/e2e/`.

## Verification commands

```bash
bun run typecheck
bun run lint
bun run test
bunx playwright test tests/e2e/catalog.spec.ts tests/e2e/admin-access.spec.ts
```

`tests/e2e/screenshots.spec.ts` needs the system Chrome and writes its
artifacts to the gitignored `test-results/screenshots/`. Use
`bun run screenshots:capture` for the committed set under `docs/screenshots/`.

`tests/e2e/landing.spec.ts` is the one spec that asserts real content, so run
it whenever you touch the marketing surface.

## Troubleshooting

**A public catalogue route shows the unavailable state on a healthy
database.** `src/db/index.ts` throws at import time when `DATABASE_URL` is
unset, and the page catches it. Check the variable is present in the process
that served the request, not just in your shell.

**A protected route renders instead of redirecting.** The prefix is missing
from the `matcher` in `proxy.ts`, or the layout guard is missing. A page guard
on its own does not redirect.

**`/blog/some-slug` returns 404 for a file that exists.** The `slug` in the
frontmatter, not the file name, is the URL. They are validated to match the
same pattern but they are independent.

## Next

- [Architecture](architecture.md)
- [Adding a course](adding-a-course.md)
- [Deployment](deployment.md)
- [Troubleshooting](troubleshooting.md)
