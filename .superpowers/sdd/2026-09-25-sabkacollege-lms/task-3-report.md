# Task 3 Report: Drizzle Schema and Deterministic Seed Data

## Status

Implemented and committed on `feat/sabkacollege-mvp`.

The LMS-owned PostgreSQL model now has six Drizzle tables, typed exports, constraints, indexes, relations, a server-only Neon client, deterministic seed content, and a generated initial migration. No database migration was executed because no `DATABASE_URL` was available in the environment.

## Files changed

- `.env.example`
- `package.json`
- `bun.lock`
- `drizzle.config.ts`
- `drizzle/0000_ancient_lockheed.sql`
- `drizzle/meta/0000_snapshot.json`
- `drizzle/meta/_journal.json`
- `scripts/seed.ts`
- `src/db/index.ts`
- `src/db/schema/users.ts`
- `src/db/schema/courses.ts`
- `src/db/schema/purchases.ts`
- `src/db/schema/lesson-progress.ts`
- `src/db/schema/index.ts`
- `src/db/seed/data.ts`
- `tests/unit/db/schema-contract.test.ts`

Dependency additions:

- Runtime: `drizzle-orm`, `@neondatabase/serverless`, `server-only`
- Development: `drizzle-kit`

## Implementation summary

- Added UUID primary keys, timezone-aware timestamps, foreign keys, nonnegative money/position/duration checks, and required indexes.
- Added unique constraints for `purchases.clerk_purchase_id` and `lesson_progress(user_id, lesson_id)` plus deterministic module/lesson ordering constraints.
- Added the exact status unions:
  - `draft | published | archived`
  - `pending | paid | refunded | revoked`
  - `automatic | manual`
- Added relations for users, courses, modules, lessons, purchases, and lesson progress.
- Added a server-only Neon HTTP Drizzle singleton that fails clearly when `DATABASE_URL` is absent.
- Added two published courses, one draft course, ordered modules, six video lessons, and three preview lessons. Seed rows use stable UUIDs/slugs and upserts.
- Seed data does not create users, purchases, or lesson progress, so it does not fabricate payments for real users.
- Updated `db:seed` to run Bun with the `react-server` condition so the `server-only` boundary is honored by the CLI.
- Kept `.env.example` free of credentials and documented all requested variables.

## Commands and outcomes

### Required verification

1. `bun run db:generate`
   - Exit: 0
   - Outcome: generated `drizzle/0000_ancient_lockheed.sql` and metadata for six tables.

2. `bun run typecheck`
   - Exit: 0
   - Outcome: `tsc --noEmit` completed with no diagnostics.

3. `bun test tests/unit/db/schema-contract.test.ts`
   - Exit: 0
   - Outcome: 4 passed, 0 failed, 4 assertions.

4. `bun run lint`
   - Exit: 0
   - Outcome: ESLint completed with no errors or warnings.

### Environment check

5. `if [ -n "${DATABASE_URL:-}" ]; then ...`
   - Outcome: `DATABASE_URL_PRESENT=no`
   - `bun run db:migrate` was not run because no safe development database URL was available. Required local command: `bun run db:migrate` after setting a development `DATABASE_URL`.

### TDD red/green evidence

- Before schema implementation, `bun test tests/unit/db/schema-contract.test.ts` failed because `src/db/schema` did not exist (expected red state).
- After implementation, the same test passed all four contract cases.

## Commit

- `e3ae2f8 feat: add Drizzle schema and deterministic seed data`

## Self-review

- Confirmed no subscriptions, cohorts, certificates, forums, chat, revenue splits, or direct-upload models were added.
- Confirmed schema constraints use integer cents and integer seconds.
- Confirmed required unique and lookup indexes are present in the generated SQL.
- Confirmed seed ordering is stable through numeric module/lesson positions and stable UUIDs.
- Confirmed seed writes use conflicts/upserts and run parent-first.
- Confirmed no `.env` file or credential was added.
- Confirmed no push or pull request was performed.

## Concerns and follow-up

- The migration has not been applied to a live development database. Apply it locally with `bun run db:migrate` after setting a safe development `DATABASE_URL`.
- Idempotent seed behavior was verified by code review, not a live database rerun, because no database URL was available.
- Seeded video lessons have deterministic metadata and `videoUrl: null`; real media URLs can be populated later through the intended media workflow without making the seed depend on external assets.

## Review Fix

Addressed all Task 3 review findings:

- Replaced the generated UUID plus separate `clerkUserId` identity model with the Clerk user ID as the text primary key, and added synchronized `role` and `lastSyncedAt` fields.
- Aligned courses with the approved catalog and Clerk billing contract: `slug`, `shortDescription`, `priceAmount`, `clerkProductId`, `clerkPriceId`, and `estimatedDurationMinutes`, with the corresponding unique/index and nonnegative checks.
- Replaced lesson `type` and `videoUrl` with stable lesson slugs, the approved video-provider union, and `videoReference`.
- Replaced legacy progress fields with `lastPositionSeconds`, bounded `maxWatchedPercentage`, and completion represented by `completedAt` plus `completionMethod`; removed the redundant completion boolean.
- Changed purchase and progress user foreign keys to Clerk text IDs and aligned purchase money storage with `amount`.
- Removed the unsupported Neon HTTP transaction call. Seed writes now run parent-first and use stable-ID ordered upserts.
- Expanded the contract test to cover columns, enums/types, defaults, constraints, indexes, foreign keys, relations, and type-level unions.
- Regenerated the stale initial Drizzle migration and its metadata from the current schema.

### Generator diagnosis and workflow

- Installed CLI: `drizzle-kit` 0.31.11 with `drizzle-orm` 0.45.3.
- `drizzle-kit generate --help` exposes no forced/non-interactive generation flag.
- The first `bun run db:generate` reproduced the rename conflict. Drizzle entered `promptColumnsConflicts`, and its prompt renderer rejected the non-TTY shell with: `Interactive prompts require a TTY terminal`. The installed CLI printed that failure but incorrectly returned exit code 0 and produced no migration.
- Because this is the unapplied initial migration, no `DATABASE_URL` was present, and the report already documented that it had never been applied, the smallest safe resolution was to generate a clean replacement in an empty temporary output directory with the same installed CLI. After inspecting the generated SQL and snapshot, only the three stale generated artifacts were replaced. No generated SQL was hand-edited. A subsequent `bun run db:generate` completed with `No schema changes, nothing to migrate`.

### Verification commands and outcomes

- `bun run db:generate` — exit 0; current six-table schema detected and no further migration created.
- `bun test tests/unit/db/schema-contract.test.ts` — exit 0; 6 passed, 0 failed, 103 assertions.
- `bun run typecheck` — exit 0; no TypeScript diagnostics.
- `bun run lint` — exit 0; no ESLint errors or warnings.
- `bun run build` — exit 0; production build compiled and generated `/404`. Next.js retained the known warning that an external `package-lock.json` above the repository root was ignored while resolving the Turbopack root.

### Limitations

- `DATABASE_URL` was not present. No live migration (`bun run db:migrate`) or live seed rerun was attempted.
- Seed idempotency and ordered upserts are verified by source inspection and the passing contract suite, not by execution against PostgreSQL.
- Preview video references are deterministic repo-relative demo paths; the seeded media files are not exercised by this schema task.
