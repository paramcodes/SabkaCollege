# SabkaCollege LMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the SabkaCollege MVP: a public self-paced course catalog, Clerk authentication and one-time billing, protected video learning with progress, student and admin dashboards, and teammate documentation with Playwright screenshots.

**Architecture:** Build one Next.js App Router application as a modular monolith. Drizzle owns LMS content and progress data in Neon; Clerk owns sessions, user metadata, and billing. Public pages read published content, student routes require an active paid purchase, and admin server actions require the Clerk admin role. Keep feature code separated into catalog, learning, billing, student, and admin modules.

**Tech Stack:** Bun, Next.js App Router, TypeScript, React, Tailwind CSS, shadcn/ui, Clerk, Clerk Billing, Drizzle ORM, Neon PostgreSQL, Zod, GSAP, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-25-sabkacollege-lms-design.md`

## Global Constraints

- Use Bun for package installation, scripts, and commands.
- Use Next.js App Router and TypeScript.
- Use Clerk for authentication, sessions, public role metadata, and billing.
- Use Drizzle ORM with Neon PostgreSQL for application data.
- Use shadcn/ui primitives for accessible base controls.
- Use GSAP only for purposeful motion; respect `prefers-reduced-motion`.
- Sell one-time course access only; do not add subscriptions.
- Require authentication before purchase; keep catalog, course overviews, and syllabi public.
- Mark a lesson automatically complete at 90% watched; also allow manual completion.
- Only admins may create, edit, publish, archive, or reorder course content.
- Verify Clerk webhook signatures and make webhook processing idempotent.
- Do not expose unpublished courses, lesson video references, or admin controls publicly.
- Keep billing secrets, Clerk secrets, and database credentials server-only.
- Do not add cohorts, subscriptions, certificates, forums, chat, instructor revenue splits, or direct video uploads in this MVP.
- Commit after each independently testable task.

## File Structure and Ownership

The initial implementation creates these boundaries:

```text
app/
├── (marketing)/page.tsx                 # landing page
├── (catalog)/courses/page.tsx            # public catalog
├── (catalog)/courses/[courseSlug]/      # overview and syllabus
├── (auth)/sign-in/                       # Clerk sign-in
├── (auth)/sign-up/                       # Clerk sign-up
├── (learning)/learn/[courseSlug]/        # student learning area
├── (student)/dashboard/                  # student dashboard
├── (admin)/admin/                        # admin pages
├── (docs)/docs/                          # teammate documentation
├── (content)/blog/                       # blog pages
└── api/webhooks/clerk/route.ts            # Clerk webhook endpoint

src/
├── actions/                              # validated server actions
├── components/ui/                        # shadcn primitives
├── components/layout/                    # site header/footer
├── components/catalog/                   # course cards/filter/forms
├── components/learning/                  # video/player/timeline/progress
├── components/dashboards/                # student/admin views
├── db/schema/                            # Drizzle tables and relations
├── db/queries/                           # read queries
├── db/seed/                              # deterministic development seed
├── lib/auth/                             # Clerk session/role helpers
├── lib/billing/                          # Clerk Billing adapter and webhooks
├── lib/validation/                       # Zod schemas
├── lib/utils/                            # pure progress, ordering, formatting
└── styles/                               # design tokens and global styles

tests/
├── unit/                                 # Vitest unit tests
├── integration/                          # Drizzle/action tests where isolated
└── e2e/                                  # Playwright tests
scripts/
├── capture-docs-screenshots.ts
└── seed.ts
```

---

### Task 1: Initialize the Next.js Application

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `eslint.config.mjs`
- Create: `postcss.config.mjs`
- Create: `app/layout.tsx`
- Create: `app/globals.css`
- Create: `.env.example`
- Create: `README.md`
- Test: `tests/unit/smoke/app-config.test.ts`

**Interfaces:**
- Produces: a Bun-managed Next.js App Router project with `lint`, `typecheck`, `test`, and `build` scripts.
- Produces: `npm`-independent commands used by every later task.

- [ ] **Step 1: Scaffold the application with Bun**

Run:

```bash
bun create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-bun
```

If the directory is non-empty because the approved spec is present, move the spec into a temporary location, complete scaffolding, and restore `docs/superpowers/` without overwriting it.

- [ ] **Step 2: Add the project scripts**

Make `package.json` expose:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:seed": "bun scripts/seed.ts"
  }
}
```

Use the current Next.js ESLint invocation if `next lint` is removed by the installed version; the command must still run successfully with Bun.

- [ ] **Step 3: Add a deterministic app smoke test**

Create `tests/unit/smoke/app-config.test.ts` that reads `package.json` and asserts the required scripts exist:

```ts
import { describe, expect, it } from "vitest";
import packageJson from "../../../package.json";

describe("project scripts", () => {
  it("exposes the required quality commands", () => {
    expect(packageJson.scripts).toMatchObject({
      build: expect.any(String),
      lint: expect.any(String),
      typecheck: expect.any(String),
      test: expect.any(String),
    });
  });
});
```

- [ ] **Step 4: Run the test and quality commands**

Run:

```bash
bun test tests/unit/smoke/app-config.test.ts
bun run typecheck
bun run lint
```

Expected: the smoke test passes and the project typechecks and lints.

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json next.config.ts eslint.config.mjs postcss.config.mjs app .env.example README.md tests/unit/smoke/app-config.test.ts
git commit -m "chore: initialize SabkaCollege Next.js app"
```

---

### Task 2: Add the Design System and shadcn/ui

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Create: `src/styles/tokens.css`
- Create: `src/styles/animations.css`
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/textarea.tsx`
- Create: `src/components/ui/label.tsx`
- Create: `src/components/ui/select.tsx`
- Create: `src/components/ui/tabs.tsx`
- Create: `src/components/ui/dialog.tsx`
- Create: `src/components/ui/table.tsx`
- Create: `src/components/ui/skeleton.tsx`
- Create: `src/components/motion/reduced-motion-provider.tsx`
- Test: `tests/unit/styles/design-tokens.test.ts`

**Interfaces:**
- Produces: CSS variables `--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--accent`, and `--radius`.
- Produces: `MotionProvider({ children })`, which exposes a `useReducedMotion()`-compatible context for GSAP wrappers.

- [ ] **Step 1: Define the Editorial Academy tokens**

Add tokens with the approved visual direction:

```css
:root {
  --background: 42 33% 96%;
  --foreground: 45 8% 9%;
  --primary: 14 63% 40%;
  --primary-foreground: 42 33% 96%;
  --muted: 40 17% 89%;
  --muted-foreground: 45 8% 35%;
  --accent: 74 18% 42%;
  --border: 38 18% 80%;
  --radius: 0.5rem;
}
```

Use Tailwind/shadcn-compatible HSL variable syntax and add dark-mode variables only if the approved UI needs them.

- [ ] **Step 2: Add shadcn primitives**

Use the shadcn CLI or copy the current canonical primitive implementations. Keep each primitive in its own file under `src/components/ui/`. Do not create a wrapper component that changes the accessibility contract of `Button`, `Dialog`, `Select`, or `Table`.

- [ ] **Step 3: Add reduced-motion context**

Implement `MotionProvider` with a client component and a `useReducedMotion` hook that returns `true` when the media query matches. All GSAP wrappers must read this value before creating a timeline.

- [ ] **Step 4: Add a token test**

Assert the token file contains the approved accent, background, foreground, primary, and border variables. This prevents a later global CSS replacement from silently removing the visual system.

- [ ] **Step 5: Verify and commit**

```bash
bun test tests/unit/styles/design-tokens.test.ts
bun run typecheck
bun run lint
git add app/globals.css app/layout.tsx src/styles src/components/ui src/components/motion tests/unit/styles
git commit -m "feat: add Editorial Academy design system"
```

---

### Task 3: Define Drizzle Schema, Neon Connection, and Seed Data

**Files:**
- Create: `drizzle.config.ts`
- Create: `src/db/schema/users.ts`
- Create: `src/db/schema/courses.ts`
- Create: `src/db/schema/purchases.ts`
- Create: `src/db/schema/lesson-progress.ts`
- Create: `src/db/schema/index.ts`
- Create: `src/db/index.ts`
- Create: `src/db/seed/data.ts`
- Create: `scripts/seed.ts`
- Modify: `.env.example`
- Test: `tests/unit/db/schema-contract.test.ts`

**Interfaces:**
- Produces: `db`, Neon connection singleton, and Drizzle tables.
- Produces: `insertSeedData(db)` for deterministic local seed content.
- Required tables: `users`, `courses`, `modules`, `lessons`, `purchases`, `lessonProgress`.

- [ ] **Step 1: Add environment variable names**

Document these names in `.env.example`:

```dotenv
DATABASE_URL=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_WEBHOOK_SIGNING_SECRET=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
CLERK_INITIAL_ADMIN_EMAILS=
```

Do not add real credentials or commit `.env` files.

- [ ] **Step 2: Define schema constraints**

Define UUID primary keys, timestamps, indexes on `courseId`, `moduleId`, `userId`, and `courseSlug`, and the unique constraints `purchases.clerkPurchaseId` and `lessonProgress(userId, lessonId)`. Use numeric integer cents for money and integer seconds for playback positions.

- [ ] **Step 3: Define relations and status unions**

Use these exact union values:

```ts
export const courseStatus = ["draft", "published", "archived"] as const;
export const purchaseStatus = ["pending", "paid", "refunded", "revoked"] as const;
export const completionMethod = ["automatic", "manual"] as const;
```

Define relations from courses to modules, modules to lessons, users to purchases, users to lesson progress, and courses to purchases/progress through lessons.

- [ ] **Step 4: Add the database singleton and seed data**

Create `src/db/index.ts` with a server-only Neon/Drizzle client. Seed two published courses, one draft course, ordered modules, video lessons, preview lessons, and no fake payments for real users. Seed content must be safe to rerun using stable slugs/IDs and upserts.

- [ ] **Step 5: Add schema contract tests**

Read the exported schema keys and assert the six required table names exist. Add a pure test for the status unions so invalid status values fail at compile time in later tasks.

- [ ] **Step 6: Generate and verify migration artifacts**

Run:

```bash
bun run db:generate
bun run typecheck
bun test tests/unit/db/schema-contract.test.ts
```

If a real `DATABASE_URL` is available, run `bun run db:migrate` against a development database. Otherwise keep the generated migration and document the required local command without pretending migration execution occurred.

- [ ] **Step 7: Commit**

```bash
git add drizzle.config.ts src/db scripts/seed.ts .env.example tests/unit/db
git commit -m "feat: add Drizzle schema and deterministic seed data"
```

---

### Task 4: Add Clerk Authentication, User Sync, and Admin Authorization

**Files:**
- Create: `proxy.ts`
- Create: `app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- Create: `app/(auth)/sign-up/[[...sign-up]]/page.tsx`
- Create: `src/lib/auth/session.ts`
- Create: `src/lib/auth/roles.ts`
- Create: `src/lib/auth/guards.ts`
- Create: `src/lib/auth/user-sync.ts`
- Create: `app/api/webhooks/clerk/route.ts`
- Create: `src/lib/validation/user.ts`
- Test: `tests/unit/auth/roles.test.ts`
- Test: `tests/unit/auth/guards.test.ts`

**Interfaces:**
- Produces: `getCurrentUserId(): Promise<string | null>`.
- Produces: `getCurrentAppUser(): Promise<AppUser | null>`.
- Produces: `requireUser(): Promise<AppUser>` and `requireAdmin(): Promise<AppUser>`.
- Produces: `syncClerkUser(event): Promise<void>`.
- Consumes: `users` from Task 3.

- [ ] **Step 1: Write role and guard tests**

Test these exact rules:

```ts
it("allows students", () => {
  expect(canAccessAdmin({ role: "student" })).toBe(false);
});

it("allows admins", () => {
  expect(canAccessAdmin({ role: "admin" })).toBe(true);
});

it("rejects a missing user", async () => {
  await expect(requireUser(null)).rejects.toThrow("Authentication required");
});
```

- [ ] **Step 2: Implement Clerk session and role helpers**

Use the current Clerk Next.js server API from the installed package. Resolve the session, read the Clerk user public metadata role, and synchronize the local `users` row when a valid session is present. Treat a missing or invalid role as `student`, never as `admin`.

- [ ] **Step 3: Implement route protection**

Protect `/dashboard(.*)`, `/learn(.*)`, and `/admin(.*)` in the Clerk middleware matcher. The middleware improves UX but does not replace `requireAdmin()` in server actions or `requireUser()` in server-rendered protected pages.

- [ ] **Step 4: Implement the signed user webhook**

Verify the Clerk webhook signature with the raw request body. Handle user created, updated, and deleted events idempotently. Upsert user identity fields and role; delete only the local mirror when Clerk confirms deletion.

- [ ] **Step 5: Run tests and typecheck**

```bash
bun test tests/unit/auth
bun run typecheck
bun run lint
```

- [ ] **Step 6: Commit**

```bash
git add proxy.ts 'app/(auth)' src/lib/auth app/api/webhooks/clerk src/lib/validation/user.ts tests/unit/auth
git commit -m "feat: add Clerk auth and admin guards"
```

---

### Task 5: Add Validation, Course Queries, and Cache Tags

**Files:**
- Create: `src/lib/validation/course.ts`
- Create: `src/lib/validation/lesson.ts`
- Create: `src/lib/validation/progress.ts`
- Create: `src/db/queries/courses.ts`
- Create: `src/db/queries/progress.ts`
- Create: `src/lib/utils/course-order.ts`
- Create: `src/lib/utils/progress.ts`
- Test: `tests/unit/validation/course.test.ts`
- Test: `tests/unit/utils/course-order.test.ts`
- Test: `tests/unit/utils/progress.test.ts`

**Interfaces:**
- Produces: `getPublishedCourses()`, `getPublishedCourseBySlug(slug)`, and `getCourseSyllabus(courseId)`.
- Produces: `getPublicPreviewLesson(courseSlug, lessonId)` that returns video data only when the lesson belongs to a published course and `isPreview` is true.
- Produces: `calculateCourseProgress(totalLessons, completedLessons): number`.
- Produces: `shouldAutoComplete(maxWatchedPercentage): boolean`.
- Produces: `normalizePositions<T extends { position: number }>(items: T[]): T[]`.

- [ ] **Step 1: Write pure utility tests first**

Cover these exact behaviors:

```ts
it("normalizes positions from zero", () => {
  expect(normalizePositions([{ id: "b", position: 9 }, { id: "a", position: 4 }])).toEqual([
    { id: "a", position: 0 },
    { id: "b", position: 1 },
  ]);
});

it("completes at ninety percent", () => {
  expect(shouldAutoComplete(0.89)).toBe(false);
  expect(shouldAutoComplete(0.9)).toBe(true);
});

it("rounds course progress", () => {
  expect(calculateCourseProgress(3, 1)).toBe(33);
  expect(calculateCourseProgress(0, 0)).toBe(0);
});
```

- [ ] **Step 2: Implement Zod schemas**

Define schemas for course fields, module ordering, lesson fields, external video references, and progress updates. Enforce non-empty titles, positive prices for purchasable courses, valid provider enum, and finite non-negative playback positions.

- [ ] **Step 3: Implement read queries with public-only filters**

Query only `status = 'published'` from public query functions. Return nested courses with ordered modules and lessons. Do not select `videoReference` for non-preview lessons in public payloads.

- [ ] **Step 4: Implement pure progress and ordering helpers**

Keep these helpers free of database and Clerk imports so they can be tested without a database. Use integer seconds and clamp `maxWatchedPercentage` to the inclusive range 0–1.

- [ ] **Step 5: Run unit tests**

```bash
bun test tests/unit/validation tests/unit/utils
bun run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/validation src/db/queries src/lib/utils tests/unit/validation tests/unit/utils
git commit -m "feat: add course queries and progress rules"
```

---

### Task 6: Add Clerk Billing, Webhook Purchases, and Entitlements

**Files:**
- Create: `src/lib/billing/checkout.ts`
- Create: `src/lib/billing/webhooks.ts`
- Create: `src/lib/billing/entitlements.ts`
- Create: `src/actions/billing.ts`
- Create: `tests/unit/billing/entitlements.test.ts`
- Create: `tests/unit/billing/webhook-idempotency.test.ts`

**Interfaces:**
- Produces: `createCourseCheckout({ courseId, userId }): Promise<{ checkoutUrl: string }>`.
- Produces: `hasCourseAccess(userId: string, courseId: string): Promise<boolean>`.
- Produces: `handleClerkBillingEvent(event: VerifiedBillingEvent): Promise<void>`.
- Consumes: Clerk Billing API and `purchases` from Task 3.

- [ ] **Step 1: Write entitlement and idempotency tests**

Test the pure entitlement decision for `pending`, `paid`, `refunded`, and `revoked` purchases, then test that processing the same verified event twice still leaves one purchase.

- [ ] **Step 2: Implement the Billing adapter**

Use the current official Clerk Billing integration for one-time product/price checkout. The server action must require `requireUser()`, load the published course and its configured Clerk price, and never accept an unchecked client-supplied amount.

- [ ] **Step 3: Implement verified webhook processing**

Verify the raw body and signature, map the Billing event to `pending`, `paid`, `refunded`, or `revoked`, and upsert by `clerkPurchaseId`. Store the Clerk user ID and course ID only after validating the referenced records.

- [ ] **Step 4: Implement access checks**

`hasCourseAccess` returns true only for a matching `paid` purchase. Students with a refunded or revoked purchase lose learning access. Public course pages do not call this function.

- [ ] **Step 5: Run tests and typecheck**

```bash
bun test tests/unit/billing
bun run typecheck
bun run lint
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/billing src/actions/billing.ts tests/unit/billing
git commit -m "feat: add Clerk Billing purchases and entitlements"
```

---

### Task 7: Build Site Layout, Landing Page, and Motion Primitives

**Files:**
- Create: `src/components/layout/site-header.tsx`
- Create: `src/components/layout/site-footer.tsx`
- Create: `src/components/motion/reveal.tsx`
- Create: `src/components/motion/hero-motion.tsx`
- Create: `app/(marketing)/layout.tsx`
- Create: `app/(marketing)/page.tsx`
- Create: `app/(marketing)/pricing/page.tsx`
- Create: `src/lib/content/landing.ts`
- Test: `tests/e2e/landing.spec.ts`

**Interfaces:**
- Produces: `Reveal({ children, delay?: number })`, a client wrapper that disables animation when reduced motion is requested.
- Produces: `HeroMotion()`, a client wrapper for the landing hero timeline.
- Produces: public `SiteHeader` and `SiteFooter` used by all public routes.

- [ ] **Step 1: Write the landing E2E smoke test**

```ts
import { expect, test } from "@playwright/test";

test("landing page introduces SabkaCollege and links to courses", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /SabkaCollege/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /explore courses/i })).toBeVisible();
  await page.getByRole("link", { name: /explore courses/i }).click();
  await expect(page).toHaveURL(/\/courses/);
});
```

- [ ] **Step 2: Build the shared shell**

Implement responsive navigation with a desktop menu, mobile menu, sign-in link, and dashboard link. Use `next/link` for internal navigation and preserve focus styles from shadcn/ui.

- [ ] **Step 3: Build the landing page**

Use real content from `src/lib/content/landing.ts`. Include hero, featured-course placeholder area, outcomes, how-it-works, learning preview, credibility section, final CTA, and footer. Query the database for featured published courses when the database is configured; otherwise render a clearly marked development fallback rather than crashing the page.

- [ ] **Step 4: Add GSAP motion**

Animate hero elements once on mount with opacity and short vertical offsets. Use `gsap.context()` cleanup, avoid animating layout properties, and skip the timeline when reduced motion is true. Do not use GSAP for ordinary button hover states.

- [ ] **Step 5: Verify the page**

```bash
bun run typecheck
bun run lint
bunx playwright test tests/e2e/landing.spec.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/components/layout src/components/motion app/'(marketing)' src/lib/content tests/e2e/landing.spec.ts
git commit -m "feat: build SabkaCollege landing experience"
```

---

### Task 8: Build the Public Catalog and Course Pages

**Files:**
- Create: `src/components/catalog/course-card.tsx`
- Create: `src/components/catalog/course-filters.tsx`
- Create: `src/components/catalog/course-syllabus.tsx`
- Create: `src/components/catalog/purchase-card.tsx`
- Create: `app/(catalog)/courses/page.tsx`
- Create: `app/(catalog)/courses/[courseSlug]/page.tsx`
- Create: `app/(catalog)/courses/[courseSlug]/syllabus/page.tsx`
- Create: `app/(catalog)/courses/[courseSlug]/preview/[lessonSlug]/page.tsx`
- Create: `src/components/catalog/public-preview-player.tsx`
- Create: `src/lib/validation/catalog-search.ts`
- Test: `tests/unit/catalog/search.test.ts`
- Test: `tests/e2e/catalog.spec.ts`

**Interfaces:**
- Consumes: `getPublishedCourses()` and `getPublishedCourseBySlug(slug)` from Task 5.
- Consumes: `createCourseCheckout()` from Task 6.
- Produces: public course listing, overview, syllabus, and purchase CTA.

- [ ] **Step 1: Write catalog search tests**

Test empty search, category filtering, and deterministic sorting by title. Search input must normalize whitespace and reject an unbounded query string.

- [ ] **Step 2: Build the catalog list and filters**

Render a responsive course grid, search input, category select, empty state, and loading state. Keep filter state in the URL search parameters so a course list can be shared and refreshed safely.

- [ ] **Step 3: Build the course overview**

Render title, description, outcomes, instructor metadata, duration, lesson count, price, preview lesson links, and purchase CTA. If the user already has a paid purchase, replace the purchase CTA with a “Continue learning” link.

- [ ] **Step 4: Build the syllabus page**

Render the complete module/lesson outline. Show lock icons for non-preview lessons. Do not render video provider references or playable media for locked lessons. Link preview lessons to `/courses/[courseSlug]/preview/[lessonSlug]`, where `getPublicPreviewLesson` verifies the published course and `isPreview` flag before rendering the provider-safe player.

- [ ] **Step 5: Verify catalog and course routes**

```bash
bun test tests/unit/catalog tests/e2e/catalog.spec.ts
bun run typecheck
bun run lint
```

- [ ] **Step 6: Commit**

```bash
git add src/components/catalog app/'(catalog)' src/lib/validation/catalog-search.ts tests/unit/catalog tests/e2e/catalog.spec.ts
git commit -m "feat: add public course catalog and syllabus pages"
```

---

### Task 9: Build the Admin Content Management

**Files:**
- Create: `src/actions/admin-courses.ts`
- Create: `src/components/admin/course-form.tsx`
- Create: `src/components/admin/module-editor.tsx`
- Create: `src/components/admin/lesson-editor.tsx`
- Create: `app/(admin)/admin/layout.tsx`
- Create: `app/(admin)/admin/page.tsx`
- Create: `app/(admin)/admin/courses/page.tsx`
- Create: `app/(admin)/admin/courses/new/page.tsx`
- Create: `app/(admin)/admin/courses/[courseId]/edit/page.tsx`
- Create: `app/(admin)/admin/students/page.tsx`
- Create: `app/(admin)/admin/purchases/page.tsx`
- Test: `tests/unit/admin/course-actions.test.ts`
- Test: `tests/e2e/admin-access.spec.ts`

**Interfaces:**
- Produces: `saveCourse(input)`, `saveModule(input)`, `saveLesson(input)`, `reorderModules(input)`, `reorderLessons(input)`, `setCourseStatus(input)`.
- Every action consumes `requireAdmin()` and returns a typed success/error result.
- Consumes: course schemas and ordering helpers from Task 5.

- [ ] **Step 1: Write authorization and validation tests**

Assert each action rejects a missing user, rejects a student, rejects invalid slugs, and accepts valid normalized content for an admin. Use dependency injection for the database/auth boundary so the test does not require a real Clerk session.

- [ ] **Step 2: Implement transactional course actions**

Parse every action input with Zod, call `requireAdmin()`, write the course and nested structure inside a transaction, normalize positions, and invalidate `courses`/`course:${courseId}` cache tags only after the transaction succeeds.

- [ ] **Step 3: Build the admin shell**

Render admin navigation, a clear admin badge, course list, and links to new course creation. Keep all destructive operations behind confirmation dialogs and typed server actions.

- [ ] **Step 4: Build course/module/lesson editors**

Support create, edit, reorder, delete, preview toggle, provider/reference selection, duration, and draft/published status. Use accessible shadcn dialogs, inputs, selects, and buttons. Never make a draft course publicly visible until status is explicitly published.

- [ ] **Step 5: Build students and purchases views**

Render only server-provided user and purchase fields. Add pagination to purchases and students. Do not expose Clerk session tokens, webhook secrets, or raw provider payloads in tables.

- [ ] **Step 6: Verify admin boundaries**

```bash
bun test tests/unit/admin tests/e2e/admin-access.spec.ts
bun run typecheck
bun run lint
```

- [ ] **Step 7: Commit**

```bash
git add src/actions/admin-courses.ts src/components/admin app/'(admin)' tests/unit/admin tests/e2e/admin-access.spec.ts
git commit -m "feat: add admin course management"
```

---

### Task 10: Build the Student Dashboard

**Files:**
- Create: `src/db/queries/student.ts`
- Create: `src/components/dashboards/student-dashboard.tsx`
- Create: `src/components/dashboards/course-progress-card.tsx`
- Create: `src/components/dashboards/continue-learning.tsx`
- Create: `app/(student)/dashboard/page.tsx`
- Test: `tests/unit/dashboards/progress-card.test.ts`
- Test: `tests/e2e/dashboard-access.spec.ts`

**Interfaces:**
- Produces: `getStudentDashboard(userId): Promise<StudentDashboardData>`.
- Produces: `CourseProgressCard` and `ContinueLearning` components.
- Consumes: paid purchases and `lessonProgress` from Tasks 3–6.

- [ ] **Step 1: Define dashboard data types and tests**

Test that the dashboard includes only paid courses, selects the most recently active incomplete lesson for Continue Learning, and returns zero progress for a course with no completed lessons.

- [ ] **Step 2: Implement dashboard queries**

Join paid purchases to courses, ordered modules, lessons, and the current user’s progress. Return only fields needed by the dashboard. Do not issue one query per course in a component; use a bounded set of aggregate queries.

- [ ] **Step 3: Build the dashboard page**

Show a welcome heading, overall progress, Continue Learning, and enrolled course cards. Link Continue Learning to the first incomplete lesson or the course learning home when all lessons are complete.

- [ ] **Step 4: Verify access and rendering**

```bash
bun test tests/unit/dashboards tests/e2e/dashboard-access.spec.ts
bun run typecheck
bun run lint
```

- [ ] **Step 5: Commit**

```bash
git add src/db/queries/student.ts src/components/dashboards app/'(student)'/dashboard tests/unit/dashboards tests/e2e/dashboard-access.spec.ts
git commit -m "feat: add student progress dashboard"
```

---

### Task 11: Build the Protected Learning Area and Video Player

**Files:**
- Create: `src/db/queries/learning.ts`
- Create: `src/lib/video/providers.ts`
- Create: `src/lib/video/player-events.ts`
- Create: `src/components/learning/video-player.tsx`
- Create: `src/components/learning/learning-timeline.tsx`
- Create: `src/components/learning/lesson-header.tsx`
- Create: `src/components/learning/completion-control.tsx`
- Create: `src/actions/progress.ts`
- Create: `app/(learning)/learn/[courseSlug]/page.tsx`
- Create: `app/(learning)/learn/[courseSlug]/[lessonSlug]/page.tsx`
- Test: `tests/unit/video/player-events.test.ts`
- Test: `tests/e2e/learning-access.spec.ts`

**Interfaces:**
- Produces: `getCourseLearningView(courseSlug, userId)` with ordered modules, lessons, access, and current progress.
- Produces: `getVideoEmbedUrl(provider, reference)` for supported external providers.
- Produces: `saveLessonProgress(input)` and `markLessonComplete(input)` server actions.
- Consumes: `requireUser()` and `hasCourseAccess()`.

- [ ] **Step 1: Write provider and event tests**

Test provider allow-list behavior, rejection of arbitrary URLs, safe embed URL construction, and a progress event that clamps negative or greater-than-duration positions.

- [ ] **Step 2: Implement the video provider adapter**

Support YouTube, Vimeo, Mux, Cloudflare Stream, and an explicitly configured external provider. Reject unknown providers and arbitrary executable URLs. Keep provider-specific URL construction in `src/lib/video/providers.ts`.

- [ ] **Step 3: Implement learning queries and access**

Require a signed-in user and a paid purchase before returning `videoReference` for a non-preview lesson. Public preview lessons may be returned only by the public preview query, never by the protected learning query for an unauthorized user.

- [ ] **Step 4: Build the player and timeline**

Build a client video player that emits a progress event at most every 15 seconds and on pause/unmount. Render the timeline grouped by module, with current lesson, completed state, lock state, previous/next controls, and a mobile drawer.

- [ ] **Step 5: Build progress server actions**

Validate user, course, lesson, position, and watched percentage server-side. Upsert progress, set `completedAt` at 90% or manual completion, and return the recalculated course progress. Do not trust a client-supplied `userId` or completion flag without deriving or checking it.

- [ ] **Step 6: Verify learning behavior**

```bash
bun test tests/unit/video tests/e2e/learning-access.spec.ts
bun run typecheck
bun run lint
```

- [ ] **Step 7: Commit**

```bash
git add src/db/queries/learning.ts src/lib/video src/components/learning src/actions/progress.ts app/'(learning)' tests/unit/video tests/e2e/learning-access.spec.ts
git commit -m "feat: add protected video learning experience"
```

---

### Task 12: Add Route-Level Error, Loading, and Not-Found States

**Files:**
- Create: `app/(catalog)/courses/[courseSlug]/not-found.tsx`
- Create: `app/(catalog)/courses/[courseSlug]/loading.tsx`
- Create: `app/(learning)/learn/[courseSlug]/[lessonSlug]/loading.tsx`
- Create: `app/(learning)/learn/[courseSlug]/[lessonSlug]/error.tsx`
- Create: `app/(student)/dashboard/loading.tsx`
- Create: `app/(student)/dashboard/error.tsx`
- Create: `app/(admin)/admin/loading.tsx`
- Create: `app/(admin)/admin/error.tsx`
- Create: `src/components/layout/page-error.tsx`
- Test: `tests/e2e/error-states.spec.ts`

**Interfaces:**
- Produces: consistent user-facing loading and error boundaries without exposing stack traces, SQL, Clerk tokens, or payment payloads.

- [ ] **Step 1: Write E2E cases for public missing courses and unauthorized learning**

Mock a missing slug and an unauthenticated learning request. Assert users see a safe not-found or sign-in state and never receive a server error page with sensitive details.

- [ ] **Step 2: Add route boundaries**

Use skeleton components for loading states and retry controls for recoverable errors. Log a structured server-side error without rendering it to the user.

- [ ] **Step 3: Verify and commit**

```bash
bunx playwright test tests/e2e/error-states.spec.ts
bun run typecheck
bun run lint
git add app/'(catalog)' app/'(learning)' app/'(student)' app/'(admin)' src/components/layout/page-error.tsx tests/e2e/error-states.spec.ts
git commit -m "feat: add application loading and error states"
```

---

### Task 13: Add Documentation, Blog, and Playwright Screenshot Capture

**Files:**
- Create: `docs/blog/getting-started.md`
- Create: `docs/blog/learning-with-sabkacollege.md`
- Create: `docs/guides/getting-started.md`
- Create: `docs/guides/architecture.md`
- Create: `docs/guides/page-map.md`
- Create: `docs/guides/database.md`
- Create: `docs/guides/authentication-and-billing.md`
- Create: `docs/guides/adding-a-course.md`
- Create: `docs/guides/components.md`
- Create: `docs/guides/troubleshooting.md`
- Create: `docs/guides/deployment.md`
- Create: `app/(content)/blog/page.tsx`
- Create: `app/(content)/blog/[slug]/page.tsx`
- Create: `app/(docs)/docs/page.tsx`
- Create: `src/lib/content/blog.ts`
- Create: `src/lib/content/docs.ts`
- Create: `scripts/capture-docs-screenshots.ts`
- Create: `playwright.config.ts`
- Create: `tests/e2e/screenshots.spec.ts`
- Test: `tests/unit/content/frontmatter.test.ts`

**Interfaces:**
- Produces: public `/blog` and `/docs` pages backed by typed frontmatter.
- Produces: `capture-docs-screenshots.ts` that writes deterministic images to `docs/screenshots/`.
- Consumes: deterministic seed data from Task 3.

- [ ] **Step 1: Define Markdown frontmatter types**

Use this exact shape:

```ts
type DocumentFrontmatter = {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  readingTime: string;
  tags: string[];
};
```

Reject duplicate slugs and invalid dates in a unit test.

- [ ] **Step 2: Write the public content pages**

Read Markdown from `docs/blog` and `docs/guides` at build time, render safe Markdown without raw HTML, and generate static paths for published blog articles and guides. Link screenshots from the relevant guides.

- [ ] **Step 3: Write teammate guides**

Each guide must include purpose, file map, data flow, safe-change instructions, verification commands, and troubleshooting. `adding-a-course.md` must walk an admin from `/admin/courses/new` through module creation, lesson creation, external video reference, preview flag, testing, and publishing.

- [ ] **Step 4: Add Playwright screenshot capture**

Use fixed viewports and deterministic seed data. Capture `landing-page.png`, `courses-page.png`, `course-overview.png`, `course-syllabus.png`, `learning-page.png`, `student-dashboard.png`, and `admin-dashboard.png` into `docs/screenshots/`. Make the script skip unavailable authenticated pages with an explicit warning rather than writing misleading empty screenshots.

- [ ] **Step 5: Verify content and capture flow**

```bash
bun test tests/unit/content
bunx playwright test tests/e2e/screenshots.spec.ts
bun run typecheck
bun run lint
```

- [ ] **Step 6: Commit**

```bash
git add docs app/'(content)' app/'(docs)' src/lib/content scripts/capture-docs-screenshots.ts playwright.config.ts tests/e2e/screenshots.spec.ts tests/unit/content
git commit -m "docs: add teammate guides and blog content"
```

---

### Task 14: Run Full Verification and Prepare the Handoff

**Files:**
- Modify: `README.md`
- Create: `docs/guides/release-checklist.md`
- Create: `vercel.json` only if required by the selected Next.js deployment target
- Test: all existing tests

**Interfaces:**
- Produces: a documented local development and deployment workflow.
- Produces: a final verification report with exact commands and outcomes.

- [ ] **Step 1: Document environment setup**

README must include Bun installation, `.env` setup, Clerk app configuration, Neon URL configuration, Drizzle migration commands, seed command, dev server, and deployment prerequisites. Never include real secrets.

- [ ] **Step 2: Add release checklist**

The checklist must cover Clerk production origins, Clerk Billing webhook URL and signing secret, Neon production database, migrations, seed policy, Playwright smoke tests, reduced-motion behavior, and screenshot regeneration.

- [ ] **Step 3: Run the complete quality gate**

```bash
bun run lint
bun run typecheck
bun test
bun run build
bunx playwright test
```

- [ ] **Step 4: Run manual integration checks**

Using Clerk test-mode credentials and a development Billing product, verify:

1. Signed-in users can start checkout.
2. A paid webhook grants access to the matching course.
3. Repeating the webhook does not duplicate the purchase.
4. A refunded/revoked purchase blocks the learning route.
5. A student cannot call an admin server action.
6. A published course appears in the catalog and a draft does not.
7. A 90% watched lesson completes and the dashboard updates.
8. Reduced-motion mode leaves all content visible and interactive.

Record any environment-dependent check that cannot run locally as an explicit limitation; do not claim it passed.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/guides/release-checklist.md vercel.json
git commit -m "chore: finalize SabkaCollege release documentation"
```

## Plan Self-Review

### Spec coverage

- Landing page: Task 7
- Courses catalog: Task 8
- Course overview and syllabus: Task 8
- Video and timeline learning area: Task 11
- Student dashboard and continue learning: Task 10
- Admin dashboard, courses, students, purchases: Task 9
- Only admins add courses: Task 4 guards plus Task 9 actions
- Clerk authentication: Task 4
- Clerk Billing and one-time purchases: Task 6
- Drizzle and Neon: Task 3
- shadcn/ui: Task 2
- GSAP and reduced motion: Tasks 2 and 7
- Docs/blog folder and guides: Task 13
- Playwright screenshots: Task 13
- Error handling: Task 12
- Test quality and release verification: Tasks 1, 5, 6, 9–14

### Placeholder scan

The plan contains no unresolved implementation placeholders. Environment-dependent manual checks are explicitly separated from automated tests.

### Type consistency

- Course queries use `courseSlug` and return published courses.
- Progress actions use `userId`, `courseId`, and `lessonId` from server-derived values.
- Entitlements use `paid` purchases and support `pending`, `refunded`, and `revoked` statuses.
- Lesson completion uses `maxWatchedPercentage` in the inclusive 0–1 range and the 0.9 threshold.
- Documentation content uses the `DocumentFrontmatter` type defined in Task 13.
- Route paths match the approved design spec.

## Execution Order

Execute Tasks 1–14 in order. Tasks 1–6 create the protected data and service foundations; Tasks 7–12 deliver the visible product; Task 13 makes the project teachable and captures visual evidence; Task 14 is the release gate.
