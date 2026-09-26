---
title: "Adding a course"
description: "The full admin walkthrough: draft, modules, lessons, external video, preview flag, testing, and publishing."
slug: "adding-a-course"
publishedAt: "2026-03-02"
readingTime: "10 min read"
tags: ["admin", "content", "walkthrough"]
---

## Purpose

Take an administrator from an empty content library to a live, purchasable
course, without guessing which fields are required or which order unlocks the
publish action.

## What you are building

A course is three nested levels:

```
Course   (courses)      — the public URL, the price, the Stripe product
  Module (modules)      — an ordered block of lessons, position unique per course
    Lesson (lessons)    — one video, a global slug, a preview flag
```

Nothing is visible to the public until the **course** status is `published`.
Modules and lessons have no status of their own.

## The publish precondition

A course cannot be published until it has all of:

- a positive `priceAmount`
- a `stripeProductId` and a `stripePriceId`
- at least one module
- at least one lesson with a usable `videoReference`

The repository raises `"not ready to publish"` when any of these is missing, and
the action maps it to the error code `NOT_READY` with this message:

> The course is not ready to publish. Add a price, Stripe product and price, a
> module, and a lesson before publishing.

Check all five before attempting to publish, rather than discovering them one
at a time.

## The walkthrough

### 1. Open the new course form

Sign in with an admin account and go to `/admin/courses/new`. The route lives at
`app/(admin)/admin/courses/new/page.tsx` and is guarded twice: the
`(admin)` layout redirects signed-out users to sign-in, and the page calls
`requireAdmin` again.

The page states the rule that matters: **start with a draft, publishing is an
explicit action.**

### 2. Fill in the course details

The form is `src/components/admin/course-form.tsx`. Fields and their rules,
enforced by `courseInputSchema` in `src/lib/validation/course.ts` and the action
schema in `src/actions/admin-course-action-core.ts`:

| Field | Rule |
| --- | --- |
| `title` | Required, 1 to 200 characters |
| `slug` | Required, 160 characters max, must match `^[a-z0-9]+(?:-[a-z0-9]+)*$` |
| `shortDescription` | Optional, 1 to 500 characters |
| `description` | Required, 1 to 20,000 characters |
| `coverImageUrl` | Optional, must be a valid URL, 2,000 characters max |
| `status` | `draft`, `published`, or `archived` |
| `priceAmount` | Integer, `>= 0`, `<= 100,000,000`, **minor units** |
| `currency` | Three uppercase letters, upper-cased automatically |
| `stripeProductId` | Optional text |
| `stripePriceId` | Optional text |
| `estimatedDurationMinutes` | Integer, `>= 0`, `<= 100,000` |

**The price trap.** `priceAmount` is in minor units. For ₹4,999.00 you enter
`499900`, not `4999`. The check constraint allows `0` because a free course is
legitimate, but `courseInputSchema` refuses a positive price with a
`stripePriceId` that is zero, and the action refuses a purchasable course with
no price.

**The slug trap.** Lowercase letters, numbers, and single hyphens. No spaces, no
underscores, no leading or trailing hyphen, no double hyphen. The form shows the
pattern in the help text under the field, and the database enforces uniqueness.

Leave `status` as `draft` for now.

### 3. Save and land on the editor

Submit the form. `CourseForm` calls the `saveCourse` server action, and on
success redirects to `/admin/courses/<id>/edit`. That redirect is your
confirmation that the course exists; if you are still on `/admin/courses/new`,
the save failed and the form shows the error message above the fields.

### 4. Create a module

On the editor page, use the module editor
(`src/components/admin/module-editor.tsx`) to add a module.

| Field | Rule |
| --- | --- |
| `title` | Required, 1 to 200 characters |
| `description` | Optional |
| `position` | Integer `>= 0`, unique within this course |

Position is assigned by `normalizePositions` in `src/lib/utils/course-order.ts`
when you save, and by the reorder action when you drag. Give every module a
title that says what the block of lessons achieves, not just "Module 1".

### 5. Create a lesson

With at least one module, add a lesson with
`src/components/admin/lesson-editor.tsx`.

| Field | Rule |
| --- | --- |
| `slug` | Required, same pattern as course slugs, **globally unique** |
| `title` | Required, 1 to 200 characters |
| `description` | Optional |
| `position` | Integer `>= 0`, unique within the module |
| `videoProvider` | `youtube`, `vimeo`, `mux`, `cloudflare_stream`, `external` |
| `videoReference` | Provider-specific, validated per provider |
| `durationSeconds` | Integer `>= 0`, `<= 100,000,000` |
| `isPreview` | Boolean |

Lesson slugs appear in the public preview URL
`/courses/<course-slug>/preview/<lesson-slug>`, so the unique index on
`lessons.slug` is global across the whole database. "Introduction" as a lesson
slug will collide with the next course that uses it.

### 6. Attach an external video

There is no upload path. `videoReference` is resolved by
`getVideoEmbedUrl` in `src/lib/video/providers.ts`, which is strict by design.

| Provider | `videoReference` format | Resulting embed |
| --- | --- | --- |
| `youtube` | 6 to 20 chars of `A-Za-z0-9_-`, e.g. `M7lc1UVf-VE` | `https://www.youtube-nocookie.com/embed/<id>` |
| `vimeo` | 6 to 12 digits, e.g. `76979871` | `https://player.vimeo.com/video/<id>` |
| `mux` | 8 to 128 chars of `A-Za-z0-9_-` | `https://stream.mux.com/<id>/public-video` |
| `cloudflare_stream` | An `https` URL on `*.cloudflarestream.com` with a simple asset path | The iframe URL, `/iframe` appended if needed |
| `external` | An `https` URL on an allow-listed host | The URL itself |

For `external`, the host must be one of the built-in allow-list
(`www.youtube-nocookie.com`, `player.vimeo.com`, `stream.mux.com`) or listed in
`NEXT_PUBLIC_EXTERNAL_VIDEO_ALLOWED_HOSTS` or
`EXTERNAL_VIDEO_ALLOWED_HOSTS` as a comma-separated list. The URL must be
`https`, must not carry credentials, must not specify a port, and must not be
`localhost`.

Anything that fails validation resolves to `null`, and the page renders **no
player at all** rather than an unsafe one. The seed data uses a `null` reference
on its non-preview lessons for exactly this reason.

### 7. Set the preview flag

Tick `isPreview` on the lessons that should be watchable without a purchase. At
least one per course is the editorial expectation, and it is the one thing a
prospective student sees before paying.

The preview route is
`/courses/<course-slug>/preview/<lesson-slug>` in
`app/(catalog)/courses/[courseSlug]/preview/[lessonSlug]/page.tsx`. It reads
through `getPublicPreviewLesson`, which joins course, module, and lesson and
requires all three of: the course is `published`, the lesson `is_preview` is
true, and the slug pair matches. A request for a non-preview lesson returns
`notFound()` — it does not render a locked player.

### 8. Test before publishing

Publish last, and test in a way that matches how a student will arrive. Until
the course is `published`, the public URLs return `notFound()` or an unavailable
state, so you cannot check it from a signed-out browser.

The practical order:

1. `bun run test` and `bun run typecheck` if you changed any code.
2. In the admin editor, confirm the module and lesson order reads correctly.
   Ordering is what the syllabus renders.
3. Publish the course (step 9).
4. Open the course **in a private window** so you are not authenticated, and
   check `/courses/<slug>` and `/courses/<slug>/syllabus` render.
5. Open the preview lesson in the same private window and confirm the video
   plays.
6. Check `/courses` and confirm the course appears with the right price. The
   price you see is `priceAmount` formatted with `formatCurrency`.

### 9. Publish

On the editor page, set the status to `published` and save. The action calls
`setCourseStatus`, which writes `publishedAt` on the transition to `published`.

Every admin write ends with the same invalidation:

```ts
revalidateTag("courses", "max");
revalidateTag(`course:${courseId}`, "max");
revalidatePath("/admin", "layout");
revalidatePath(`/admin/courses/${courseId}/edit`);
```

If the save succeeds but revalidation throws, the action returns `CACHE_ERROR`
and the page tells you the content was saved but could not be refreshed. That
is a real state, not a lost write — reload and re-save.

## Unpublishing

Set the status to `archived`. The course leaves the catalogue immediately,
because every public query filters on `status = 'published'`. Existing
purchases and progress rows are untouched, so restoring the status restores
access. Deleting the course cascades to modules, lessons, purchases, and
progress, so treat it as irreversible.

## Safe-change steps

**Before you publish**

- The price is in minor units and the Stripe price ID matches that amount.
- Every lesson has a `videoReference` that resolves to a real embed.
- Lesson slugs are unique across the whole database.
- At least one lesson is a preview.
- Module and lesson positions are in the intended order.

**When something is wrong after publishing**

1. Set the status back to `draft` first. It takes effect through the same cache
   tags.
2. Fix the content.
3. Re-publish.
4. If the catalogue is still stale, the revalidation failed. Reload `/admin` to
   force a re-render, then re-save.

**When changing course content code**

Never write to the database from a page or a component. Course writes go
through `src/actions/admin-courses.ts`, which owns authorization, validation,
and cache invalidation. If you find yourself importing `src/db/admin-courses.ts`
outside that file, stop.

## Verification commands

```bash
bun run test tests/unit/admin
bun run typecheck
bun run lint
bunx playwright test tests/e2e/admin-access.spec.ts
```

For a full browser pass with a real admin account, run
`bunx playwright test --project=chromium` with credentials in the environment.
Never hard-code an account in a spec.

## Troubleshooting

**The form shows "Check the course details and try again."** That is the
`INVALID_INPUT` code. The message is deliberately generic; the field-level
reason is in the schema. Check the most common causes first: a slug with an
uppercase letter or a double hyphen, a `priceAmount` that is not an integer, a
currency that is not three letters, and a `coverImageUrl` that is not a full
URL.

**Saving returns `NOT_FOUND`.** The course row disappeared while you were
editing. Reload `/admin/courses` and start the edit again.

**Saving returns `NOT_READY`.** You tried to publish without all five
preconditions. The message names them.

**The course is published but not on `/courses`.** Check the status is
`published` and not `archived`, then check `publishedAt`. If the catalogue is
still stale, the revalidation failed — reload the admin page and re-save.

**A lesson saves but no video appears.** `getVideoEmbedUrl` returned `null`.
For YouTube, the reference must be 6 to 20 word characters, not a full URL. For
`external`, the host must be allow-listed and the scheme must be `https`. The
page deliberately renders nothing rather than an unsafe iframe.

**A preview URL returns 404 for a lesson that exists.** The course is not
`published`, the lesson's `isPreview` is false, or the lesson slug belongs to a
different course. All three produce the same result on purpose, so the response
does not confirm which.

**"The course was saved, but the page could not be refreshed."** `CACHE_ERROR`.
The write committed. Reload and re-save; if it recurs, compare the
`cacheTag` calls in `src/db/queries/courses.ts` with the `revalidateTag` calls
in `src/actions/admin-courses.ts`.

## Next

- [Database](#database)
- [Components](#components)
- [Troubleshooting](#troubleshooting)
