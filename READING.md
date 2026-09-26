# SabkaCollege

SabkaCollege is a self-paced learning platform. It lets visitors browse courses, read a course plan, watch selected preview lessons, and buy access to a full course. Students watch lessons online, resume where they stopped, and see their progress on a dashboard. Admins create courses, add modules and lessons, publish courses, and view students and purchases.

## Who uses it

- Visitors browse the catalogue and public course pages.
- Students sign in, buy a course, watch lessons, and track progress.
- Admins manage course content and review enrolled students and purchases.

## The main flow

1. A visitor opens the landing page or course catalogue.
2. The visitor opens a course page and reads the syllabus.
3. The visitor can watch preview lessons without buying.
4. A student signs in and starts a Stripe checkout for a course.
5. Stripe confirms the payment through a signed webhook.
6. SabkaCollege records a paid purchase and unlocks the course.
7. The student opens the learning area and watches lessons.
8. The player saves the playback position. At 90 percent progress, the lesson is marked complete. The student can also mark a lesson complete by hand.
9. The dashboard shows enrolled courses, overall progress, and the next lesson to watch.

## How the code fits together

- `app/` contains the pages. Route groups keep public, student, admin, learning, and documentation pages separate.
- `src/components/` contains reusable interface pieces such as buttons, cards, the video player, the course timeline, and the dashboard cards.
- `src/actions/` contains server actions. Server actions check the signed-in user before they read or change data.
- `src/lib/auth/` works with Clerk. Clerk stores the user session and role. SabkaCollege keeps a local user record for application queries.
- `src/lib/billing/` works with Stripe. It creates checkout sessions, verifies Stripe webhooks, and records purchases.
- `src/db/` contains the Drizzle schema, database connection, queries, and seed data.
- `src/db/schema/` defines the tables for users, courses, modules, lessons, purchases, and lesson progress.
- `docs/` contains teammate guides and blog articles. `docs/screenshots/` contains real screenshots captured with system Chrome.

## The main data rules

- Public pages show published courses only.
- A course contains ordered modules. A module contains ordered lessons.
- A lesson stores an external video reference, its duration, and whether it is a preview.
- A student can open a protected lesson only after Clerk confirms the session and a paid purchase exists.
- Progress updates come from the server session and the paid course, never from a client-supplied user ID.
- The database stores money as integer minor units, such as paise, not floating-point rupees.
- The server calculates lesson completion from a saved playback position and the lesson duration.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add the Neon `DATABASE_URL`.
3. Add Clerk keys and the admin email list.
4. Add Stripe keys when payments are ready.
5. Run the database migration and seed commands:

```bash
set -a; source .env.local; set +a
bun run db:migrate
bun run db:seed
```

6. Start the app:

```bash
bun run dev
```

## Checks to run

```bash
bun run test
bun run typecheck
bun run lint
bun run build
bunx playwright test
```

The live payment, webhook, and production Clerk flows need real Stripe, Clerk, and Neon credentials. The release checklist lists those manual checks.
