# SabkaCollege LMS — Design Specification

**Date:** 2026-09-25
**Status:** Approved design
**Product:** SabkaCollege

## 1. Product Summary

SabkaCollege is a self-paced learning management system for public course discovery and one-time course purchases. Visitors can browse a public catalog, view course overviews and syllabi, and preview selected lessons. Authenticated students can purchase lifetime access to a course, resume video lessons, track progress, and complete lessons automatically. An admin can manage the course catalog and review enrolled students and purchases.

The first release is a public platform with one initial admin. The architecture supports adding more admins later, but does not include instructor onboarding, revenue sharing, subscriptions, certificates, cohorts, or direct video uploads.

## 2. MVP Scope

### Included

- Editorial Academy landing page
- Public, searchable, filterable course catalog
- Course overview pages
- Public syllabus/course-plan pages
- Clerk authentication and role-based authorization
- One-time course purchases through Stripe Checkout
- Self-paced learning area with video player and timeline
- Autosaved playback position
- Automatic lesson completion at 90% watched plus manual completion
- Student dashboard with enrolled courses, overall progress, and Continue Learning
- Admin dashboard with course/content management, students, and purchases
- Drizzle ORM with Neon PostgreSQL
- Bun package manager
- shadcn/ui component foundation
- GSAP animation for selected interaction and entrance motion
- Playwright tests and documentation screenshots
- Repository documentation and blog Markdown

### Explicitly out of scope

- Subscription billing
- Cohorts, schedules, or live classes
- Direct video uploads and encoding
- Certificates and achievements
- Instructor-owned accounts and revenue splits
- Discussion forums, comments, messaging, and live chat
- Native mobile applications

## 3. Product Decisions

| Decision | Choice |
| --- | --- |
| Delivery model | Self-paced courses |
| Billing model | One-time purchase per course |
| Admin model | One initial admin, extensible to more admins |
| Discovery | Public catalog; sign-in required before purchase |
| Preview policy | Public syllabus with a limited number of free preview lessons |
| Video hosting | External provider URLs in the MVP |
| Curriculum | Ordered modules containing ordered lessons |
| Progress | Autosaved playback, resume, and automatic/manual completion |
| Video completion threshold | 90% watched |
| Architecture | Modular monolith in one Next.js application |
| Database | Neon PostgreSQL through Drizzle ORM |
| UI | shadcn/ui primitives plus SabkaCollege-specific components |
| Motion | GSAP for purposeful sequencing and scroll transitions |

## 4. Technology Architecture

SabkaCollege is a modular monolith. A single Next.js application contains the public marketing site, catalog, learning area, dashboards, admin tools, and documentation site. The application uses server-rendered data wherever possible, with client components only where interaction requires browser APIs such as video playback, responsive navigation, or animation.

The application is organized by product capability:

```text
app/
├── (marketing)/
├── (auth)/
├── (catalog)/
├── (learning)/
├── (student)/
├── (admin)/
├── (docs)/
├── api/
│   └── webhooks/clerk/
└── layout.tsx
src/
├── actions/
├── components/
│   ├── ui/
│   ├── courses/
│   ├── learning/
│   ├── dashboards/
│   └── layout/
├── db/
│   ├── schema/
│   └── queries/
├── lib/
│   ├── auth/
│   ├── billing/
│   ├── validation/
│   └── utils/
└── types/
```

`src/db/schema` is the Drizzle schema boundary. `src/actions` contains validated server actions. `src/lib/auth` contains Clerk session and role helpers. `src/lib/billing` contains checkout and entitlement integration. `src/components/ui` contains shadcn/ui primitives. Larger feature components live in their capability folders.

## 5. Route Map

### Public routes

- `/` — landing page
- `/courses` — course catalog
- `/courses/[courseSlug]` — course overview and purchase CTA
- `/courses/[courseSlug]/syllabus` — full public course plan
- `/courses/[courseSlug]/preview/[lessonSlug]` — public preview lesson player
- `/pricing` — purchase information and FAQ
- `/blog` — blog index
- `/blog/[slug]` — blog article
- `/docs` — public teammate documentation
- `/sign-in` — Clerk sign-in
- `/sign-up` — Clerk sign-up

### Student routes

- `/dashboard` — enrolled courses, overall progress, and Continue Learning
- `/learn/[courseSlug]` — course learning home
- `/learn/[courseSlug]/[lessonSlug]` — video player and lesson timeline

The learning timeline is available on every lesson route so students can navigate without losing their place. Learning routes require a signed-in student with an active purchase/enrollment.

### Admin routes

- `/admin` — admin overview
- `/admin/courses` — course list and publishing status
- `/admin/courses/new` — course creation
- `/admin/courses/[courseId]/edit` — course, module, and lesson editing
- `/admin/students` — enrolled students
- `/admin/purchases` — purchase and entitlement records

Admin routes are protected by both UI-level navigation filtering and server-side authorization. UI hiding is not considered a security boundary.

## 6. Data Model

Clerk is the source of truth for identities, sessions, and public role metadata. Stripe is the source of truth for payment transactions. The LMS database stores application-owned content, synchronized user and purchase mirrors, and learning state.

### `users`

- `id` — Clerk user ID, primary key
- `email`
- `name`
- `avatarUrl`
- `role` — synchronized mirror of Clerk public metadata: `student` or `admin`
- `createdAt`
- `updatedAt`
- `lastSyncedAt`

### `courses`

- `id`
- `slug`
- `title`
- `shortDescription`
- `description`
- `coverImageUrl`
- `status` — `draft`, `published`, or `archived`
- `priceAmount`
- `currency`
- `stripeProductId`
- `stripePriceId`
- `estimatedDurationMinutes`
- `createdAt`
- `updatedAt`
- `publishedAt`

### `modules`

- `id`
- `courseId`
- `title`
- `description`
- `position`
- `createdAt`
- `updatedAt`

### `lessons`

- `id`
- `moduleId`
- `title`
- `description`
- `position`
- `videoProvider` — `youtube`, `vimeo`, `mux`, `cloudflare_stream`, or `external`
- `videoReference` — provider-specific ID or URL
- `durationSeconds`
- `isPreview`
- `createdAt`
- `updatedAt`

### `purchases`

- `id`
- `stripeCheckoutSessionId`
- `stripePaymentIntentId`
- `userId`
- `courseId`
- `amount`
- `currency`
- `status` — `pending`, `paid`, `refunded`, or `revoked`
- `purchasedAt`
- `createdAt`
- `updatedAt`
- unique constraint on `stripePaymentIntentId`

### `lesson_progress`

- `id`
- `userId`
- `lessonId`
- `lastPositionSeconds`
- `maxWatchedPercentage`
- `completedAt`
- `completionMethod` — `automatic`, `manual`, or null
- `createdAt`
- `updatedAt`
- unique constraint on `userId` and `lessonId`

The entitlement check is derived from an active paid Stripe purchase for the user and course. Purchases are not duplicated when Stripe retries a webhook.

## 7. Request and Data Flows

### Authentication and roles

1. Clerk handles sign-in and sign-up.
2. Server-side helpers resolve the current Clerk session.
3. User records and public role metadata are synchronized from signed Clerk webhooks.
4. The initial admin is assigned through an explicit environment or seed configuration that updates Clerk metadata.
5. Every admin server action checks the Clerk session and the synchronized role, and rejects requests when the two disagree.

### Public discovery

1. Server components query published courses through Drizzle queries.
2. Draft and archived courses never appear in the public catalog.
3. Public course pages may expose course metadata, syllabus, and preview lessons.
4. Successful admin content mutations invalidate relevant Next.js cache tags.

### Purchase and enrollment

1. A visitor can browse courses and syllabi without signing in.
2. Purchase requires a Clerk session.
3. The server creates a Stripe Checkout Session for the selected course's configured Stripe Price and Clerk user.
4. A signed Stripe webhook receives payment lifecycle events.
5. The webhook handler verifies the signature, deduplicates event delivery, and writes the purchase.
6. A paid purchase grants access to the learning area.
7. Refund or dispute events deactivate access according to the purchase status.

The webhook handler must be safe to retry and must never create duplicate purchases.

### Video progress

1. The video adapter loads an external video by provider reference.
2. The player restores the last saved playback position.
3. The client sends throttled position updates.
4. The server validates the lesson, user session, and active enrollment.
5. The server stores position and maximum watched percentage.
6. A lesson automatically completes at 90% watched.
7. Students can also mark a lesson complete manually.
8. Course progress is calculated from completed lessons and module/course totals.

### Admin content management

1. Admin forms call validated server actions.
2. The actions require a signed-in admin.
3. Course, module, and lesson updates run transactionally.
4. Position values are normalized after reordering.
5. Publish/unpublish actions update course visibility and invalidate caches.

## 8. UI and Component System

The UI direction is **Editorial Academy**:

- Warm ivory background
- Near-black text
- Rust/terracotta primary accent
- Muted olive and sand secondary colors
- Large editorial headings
- Thin borders
- Restrained shadows
- Minimal but deliberate corner radii
- Responsive layouts that remain readable on mobile

shadcn/ui provides accessible primitives. SabkaCollege-specific components provide LMS behavior.

### Shared components

- `SiteHeader`
- `SiteFooter`
- `CourseCard`
- `CourseProgress`
- `ProgressRing`
- `ModuleAccordion`
- `LessonRow`
- `VideoPlayer`
- `LearningTimeline`
- `StatCard`
- `DataTable`
- `AdminCourseForm`
- `ModuleEditor`
- `LessonEditor`
- `EmptyState`
- `LoadingState`
- `ErrorState`

### Page composition

The landing page includes a hero, learning outcomes, featured courses, how-it-works, learning experience preview, credibility/testimonial content, final CTA, and footer.

Course overview pages include title, description, outcomes, instructor information, price, purchase CTA, duration, lesson count, preview lessons, and enrollment state.

Syllabus pages display the full ordered module/lesson outline. Locked lessons remain visible in the plan but cannot be opened without an active purchase.

Learning pages use a main video area and a sticky timeline on large screens. Mobile uses a compact timeline drawer. Controls include previous/next navigation, save state, manual completion, and progress indication.

## 9. GSAP Animation Policy

GSAP is reserved for motion that improves hierarchy, continuity, or feedback:

- Hero entrance
- Section reveal while scrolling
- Course-card hover transitions
- Accordion and timeline transitions
- Route-level transitions where useful
- Progress bar and completion feedback

GSAP must not be used for simple hover states, blocking interaction, or layout-critical animation. All motion respects `prefers-reduced-motion`, preserves keyboard navigation, and does not prevent content from being understood without JavaScript.

## 10. Documentation and Screenshots

The repository will contain:

```text
docs/
├── blog/
├── guides/
│   ├── getting-started.md
│   ├── architecture.md
│   ├── page-map.md
│   ├── database.md
│   ├── authentication-and-billing.md
│   ├── adding-a-course.md
│   ├── components.md
│   ├── troubleshooting.md
│   └── deployment.md
└── screenshots/
```

Every guide will explain:

1. What the feature does
2. Why it exists
3. Which files implement it
4. How data flows through it
5. How a teammate changes it safely
6. How to verify the change
7. Common mistakes and fixes

The documentation should be suitable for a teammate who did not build the project. The requested “Matt Pocock teach” skill is not currently installed. Unless a specific skill path is provided, the implementation will use this equivalent docs-first teaching structure.

A Playwright script will use deterministic seed data and consistent viewports to capture:

- `landing-page.png`
- `courses-page.png`
- `course-overview.png`
- `course-syllabus.png`
- `learning-page.png`
- `student-dashboard.png`
- `admin-dashboard.png`

The screenshots will be stored under `docs/screenshots/` and referenced by the documentation.

## 11. Testing and Quality Gates

### Unit tests

- Validation schemas
- Progress calculations
- Completion threshold behavior
- Role and entitlement helpers
- Course and module ordering

### Integration tests

- Drizzle queries
- Webhook idempotency
- Purchase and enrollment transitions
- Admin server actions

### End-to-end tests

- Landing page and catalog navigation
- Clerk sign-in behavior
- Public syllabus access
- Unauthorized learning-page access
- Student playback and completion
- Admin course creation
- Responsive navigation

### Required commands

```bash
bun run lint
bun run typecheck
bun test
bun run build
bunx playwright test
```

Billing checkout, real Clerk sessions, Stripe webhook delivery, refund/revocation behavior, and production deployment require manual verification in addition to automated tests.

## 12. Error Handling and Security

- Use not-found boundaries for missing courses, modules, and lessons.
- Use unauthorized states for missing sessions or entitlements.
- Validate all server inputs with Zod.
- Verify Clerk webhook signatures.
- Deduplicate webhook event processing.
- Protect every admin mutation server-side.
- Keep billing and user secrets out of logs and client bundles.
- Use transaction boundaries for multi-record course edits.
- Return friendly form and checkout errors.
- Gracefully handle external video provider failures.
- Keep Sentry-compatible error boundaries without requiring Sentry in the MVP.
- Do not consider hidden admin links or client-side role checks sufficient.

## 13. Initial Build Order

1. Initialize the Bun/Next.js project and quality tooling.
2. Add shadcn/ui, Tailwind, linting, typechecking, and environment validation.
3. Add Drizzle schema, migrations, seed data, and Neon configuration.
4. Integrate Clerk authentication, user synchronization, and admin authorization.
5. Build public landing page and shared visual system.
6. Build catalog, course overview, and syllabus pages.
7. Integrate Stripe Checkout and webhook-driven purchases.
8. Build student dashboard and protected learning routes.
9. Add video adapter, autosave, completion, and progress calculations.
10. Build admin dashboard and content editors.
11. Add tests and Playwright screenshot capture.
12. Write teammate documentation and blog content.
13. Run full verification and document deployment steps.
