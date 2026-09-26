---
title: "Database"
description: "Schema, constraints, migrations, the read layer, cache tags, and the rules for writing queries safely."
slug: "database"
publishedAt: "2026-03-02"
readingTime: "9 min read"
tags: ["database", "drizzle", "postgres"]
---

## Purpose

Describe the data model, how migrations are produced and applied, and the
constraints that must hold no matter which code path writes a row.

## Connection

`src/db/index.ts` is the only place that creates a client.

```ts
const client = neon(databaseUrl);
export const db = drizzle(client, { schema });
```

It imports `server-only`, so importing it from a client component is a build
error rather than a runtime leak. It also throws at module load when
`DATABASE_URL` is missing. That throw is deliberate: pages that must survive a
missing database check the variable *before* importing the module, and turn the
result into an unavailable state.

Connection details are a **Neon serverless HTTP** connection string:

```bash
DATABASE_URL="postgresql://user:password@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require"
```

The `neon-http` driver uses `fetch`, not a TCP socket. Do not switch to
`node-postgres` or `postgres-js` without re-checking serverless behaviour and
cold-start time.

## Tables

### `users`

A mirror of the Clerk identity. Clerk owns identity, sessions, and role
metadata; this table only stores what the app needs to query.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `text` primary key | The Clerk user ID (`user_...`). No surrogate key |
| `email` | `text` not null | Primary email, from Clerk |
| `name` | `text` | Joined first and last name, or null |
| `avatarUrl` | `text` | Clerk avatar URL |
| `role` | `user_role` enum | `student` (default) or `admin` |
| `lastSyncedAt` | `timestamptz` | When this row was last reconciled with Clerk |
| `createdAt`, `updatedAt` | `timestamptz` | Defaults to `now()` |

Because `id` is the Clerk ID, `purchases.user_id` and
`lesson_progress.user_id` reference it directly and cascade on delete.

### `courses`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` primary key | `defaultRandom()` |
| `slug` | `text` not null, unique | Public URL segment |
| `title` | `text` not null | |
| `shortDescription` | `text` | Catalogue card copy |
| `description` | `text` not null | Overview page body |
| `coverImageUrl` | `text` | |
| `status` | `course_status` enum | `draft`, `published`, `archived`. Default `draft` |
| `priceAmount` | `integer` not null | **Minor units.** 499900 paise is ₹4,999.00 |
| `currency` | `text` not null | ISO 4217, default `INR` |
| `stripeProductId`, `stripePriceId` | `text` | Null until a Stripe price exists |
| `estimatedDurationMinutes` | `integer` not null | Default 0 |
| `publishedAt` | `timestamptz` | Set when the course is published |
| `createdAt`, `updatedAt` | `timestamptz` | |

Checks: `price_amount >= 0`, `estimated_duration_minutes >= 0`.
Indexes: unique on `slug`, plus `status` and `stripe_price_id`.

### `modules` and `lessons`

A module belongs to a course and has a `position` unique within that course.
A lesson belongs to a module, has a `position` unique within that module, and
its `slug` is **globally unique** — lesson slugs appear in the public preview
URL, so they cannot repeat across courses.

Lesson video columns:

| Column | Type | Notes |
| --- | --- | --- |
| `videoProvider` | `lesson_video_provider` enum | `youtube`, `vimeo`, `mux`, `cloudflare_stream`, `external` |
| `videoReference` | `text` | Provider-specific ID, or an allow-listed URL for `external` |
| `durationSeconds` | `integer` not null | Check: `>= 0` |
| `isPreview` | `boolean` not null | Default false. Gates the public preview route |

The MVP has **no upload path**. A lesson always points at an external host.

### `lesson_progress`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` primary key | |
| `userId` | `text` not null | References `users.id`, cascade |
| `lessonId` | `uuid` not null | References `lessons.id`, cascade |
| `lastPositionSeconds` | `integer` not null | Check: `>= 0` |
| `maxWatchedPercentage` | `real` not null | Check: between 0 and 1 inclusive |
| `completedAt` | `timestamptz` | **Non-null exactly when complete** |
| `completionMethod` | `completion_method` enum | `automatic` or `manual`, null when incomplete |

There is deliberately **no `completed` boolean**. `completedAt` is the single
source of truth and `completionMethod` records how it happened. Any change that
adds a boolean flag re-creates the ambiguity this schema removed.

Unique index on `(user_id, lesson_id)`: one row per user per lesson, so a save
is an upsert.

### `purchases`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` primary key | |
| `stripeCheckoutSessionId` | `text` | Null until the session is known |
| `stripePaymentIntentId` | `text` not null, **unique** | The webhook idempotency key |
| `stripeProductId`, `stripePriceId` | `text` | |
| `userId` | `text` not null | References `users.id`, cascade |
| `courseId` | `uuid` not null | References `courses.id`, cascade |
| `amount` | `integer` not null | Minor units. Check: `>= 0` |
| `currency` | `text` not null | Default `INR` |
| `status` | `purchase_status` enum | `pending`, `paid`, `refunded`, `revoked`. Default `pending` |
| `purchasedAt` | `timestamptz` | |

Access requires `status = 'paid'`. That is the only definition, enforced by
`canAccessPurchase` in `src/lib/billing/entitlements.ts`.

## Data flow

### Reading a published course

```
app/(catalog)/courses/[courseSlug]/page.tsx
  -> if (!process.env.DATABASE_URL) return unavailable
  -> await connection()
  -> getPublishedCourseBySlug(courseSlug)          [ "use cache" ]
       -> cacheTag("courses", "course-slug:<slug>")
       -> db.query.courses.findFirst({ where: status = 'published' AND slug = ? })
       -> cacheTag("course:<id>")
```

### Writing course content as an admin

```
src/components/admin/course-form.tsx        ["use client"]
  -> src/actions/admin-courses.ts           ["use server"]
       -> requireAdmin()                    [ throws unless role = 'admin' ]
       -> zod parse                         [ adminCourseSchema ]
       -> adminCourseRepository.saveCourse  [ src/db/admin-courses.ts ]
       -> revalidateTag("courses", "max")
       -> revalidateTag("course:<id>", "max")
       -> revalidatePath("/admin", "layout")
       -> revalidatePath("/admin/courses/<id>/edit")
```

The action returns a discriminated result, `{ ok: true, data }` or
`{ ok: false, error: { code, message } }`. It never throws for expected
failures. `admin-course-action-core.ts` takes its repository and cache
invalidation as injected dependencies, which is why it is unit-testable without
a database.

### Progress save

The player sends a position and a watched fraction. The writer in
`src/lib/video/progress-writer.ts` clamps both, then upserts on
`(user_id, lesson_id)`. `maxWatchedPercentage` only ever increases, so
scrubbing backwards does not erase what you have seen.

## Migrations

```bash
bun run db:generate   # drizzle-kit generate -> SQL files in drizzle/
bun run db:migrate    # drizzle-kit migrate  -> apply them in order
bun run db:push       # drizzle-kit push     -> diff straight to the database
bun run db:seed       # deterministic fixtures
```

Use `db:generate` plus `db:migrate` for anything that reaches another
environment. `db:push` is a local convenience; it does not produce a migration
file, so it cannot be reviewed or replayed.

`drizzle.config.ts` is `strict: true`, so destructive changes must be
acknowledged explicitly in the prompt. Read the generated SQL before you apply
it — `strict` does not stop you from dropping a column.

### Seed data

`scripts/seed.ts` and `src/db/seed/data.ts` use fixed UUIDs and a fixed
timestamp (`2026-01-01T00:00:00.000Z`), and upsert in dependency order:
courses, then modules, then lessons.

Deterministic IDs are load-bearing. `tests/e2e/admin-access.spec.ts` hard-codes
course `10000000-0000-4000-8000-000000000001`. Do not regenerate the seed IDs.

The fixture set includes two published courses, one draft, five modules, and
six lessons. Lesson `india-in-1947` is a YouTube preview using the public
Google IFrame API demo video.

## Safe-change steps

**Adding a column**

1. Add it to the Drizzle table in `src/db/schema/`.
2. Decide `notNull` plus a default, or nullable. A new `notNull` column needs a
   default or a backfill.
3. `bun run db:generate` and read the SQL.
4. `bun run db:migrate` locally.
5. `bun run test` — `tests/unit/db/schema-contract.test.ts` asserts the contract.

**Adding a query**

1. Put it in `src/db/queries/`, not in a page.
2. Add `"use cache"` and the narrowest correct `cacheTag` set.
3. Never read `cookies()` or `headers()` inside a cached scope.
4. Keep column selection explicit. `src/db/queries/query-boundaries.ts` holds
   the shared column and `where` helpers so a new query cannot accidentally
   select a `video_reference` for a public page.

**Changing progress semantics**

`completedAt` is the only completion signal. If you need a new signal, add it
as a new nullable column with a check constraint, and keep `completedAt`
authoritative. Do not reintroduce a boolean.

## Verification commands

```bash
bun run test tests/unit/db
bun run typecheck
bun run lint
bun run db:generate     # must produce no changes when the schema is clean
bunx playwright test tests/e2e/catalog.spec.ts
```

## Troubleshooting

**`DATABASE_URL is required to create the database client`.** The variable is
unset in the process that imported `src/db/index.ts`. Add it to `.env.local` for
local work, or pass it on the command line for a one-off build.

**A migration fails with a unique violation.** Existing rows already hold the
value you are adding as unique. Either backfill distinct values first or drop
the constraint in a separate migration.

**`lessons_slug_uidx` rejects a new lesson.** Lesson slugs are globally unique.
A duplicate across two different modules or courses is enough to fail.

**A course edit saves but the catalogue still shows the old copy.** The write
succeeded but a cache revalidation failed; the action returns `CACHE_ERROR` for
exactly this case. Reload the admin page and re-save, then check that
`revalidateTag` was called with the tag the query declared.

**Progress percentages exceed 1 or go negative.** A writer bypassed the clamp in
`src/lib/video/progress-writer.ts`. The database check constraint would have
rejected the row, so this is a case where the check saved you — fix the writer,
not the constraint.

## Next

- [Authentication and billing](authentication-and-billing.md)
- [Adding a course](adding-a-course.md)
- [Troubleshooting](troubleshooting.md)
