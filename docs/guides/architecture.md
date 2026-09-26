---
title: "Architecture"
description: "Route groups, the server/client split, the cache Components model, and the layer boundaries you must not cross."
slug: "architecture"
publishedAt: "2026-03-02"
readingTime: "8 min read"
tags: ["architecture", "app-router", "caching"]
---

## Purpose

Explain the structural decisions that the rest of the codebase assumes, so a
change lands in the right layer without needing to rediscover the rules.

## The stack

| Layer | Choice |
| --- | --- |
| Runtime and package manager | Bun 1.4 |
| Framework | Next.js 16 App Router with `cacheComponents: true` |
| UI | React 19, Tailwind CSS 4, shadcn-style local components |
| Database | PostgreSQL via Neon serverless, Drizzle ORM |
| Auth | Clerk (`@clerk/nextjs`), middleware via `proxy.ts` |
| Billing | Stripe Checkout, signed webhooks |
| Video | YouTube, Vimeo, Mux, Cloudflare Stream, allow-listed external |
| Tests | Vitest for units, Playwright for browser |

## File map

| Path | Layer | May import |
| --- | --- | --- |
| `app/**` | Routes and route handlers | `src/lib`, `src/db`, `src/actions`, components |
| `src/components/ui/**` | Presentational primitives | `src/components/ui`, `cn` |
| `src/components/**` (feature) | Feature components | `src/lib`, `src/components/ui` |
| `src/actions/**` | Server actions | `src/db`, `src/lib` |
| `src/db/queries/**` | Read layer | `src/db`, `src/lib` |
| `src/db/schema/**` | Drizzle tables | `drizzle-orm` only |
| `src/lib/**` | Pure domain logic | `src/lib`, `zod` |
| `src/lib/content/**` | Markdown content pipeline | `node:fs`, `src/components/content` |

The rule that matters: `src/lib` is pure. It does not import from `src/db`, and
that is what makes the unit suite fast and free of a live database.

## Route groups

Route groups are folders wrapped in parentheses. They exist to share a layout
without affecting the URL.

| Group | Layout | URL |
| --- | --- | --- |
| `(marketing)` | `SiteHeader` + `SiteFooter` | `/`, `/pricing` |
| `(catalog)` | `SiteHeader` + `SiteFooter` | `/courses`, `/courses/[courseSlug]`, ... |
| `(content)` | `SiteHeader` + `SiteFooter` | `/blog`, `/blog/[slug]` |
| `(docs)` | `SiteHeader` + `SiteFooter` | `/docs` |
| `(auth)` | Centred card | `/sign-in`, `/sign-up` |
| `(student)` | Own header/footer, `requireUser` | `/dashboard` |
| `(learning)` | Own header/footer, per-page guard | `/learn/[courseSlug]/...` |
| `(admin)` | Admin nav, `requireAdmin`, redirect on failure | `/admin` |

Because groups are invisible in the URL, `/blog` and `/docs` sit next to `/`
with no nesting. Do not move a route between groups without checking which
layout you are inheriting — the admin layout alone is a redirect boundary.

## The server/client split

The default is a Server Component. Add `"use client"` only when a component
needs state, effects, refs, or browser event handlers.

Current client components are the interactive leaf widgets: the course form,
module and lesson editors, the filters, the video player, and the completion
control. Everything else is a server component that composes them.

Client components must not receive secrets, database handles, or Stripe
objects. If a client component needs data, fetch it on the server and pass
plain serialisable props down.

## The video progress metric

MVP completion is an **approximation**, and the approximation is deliberate.
`deriveProgressFromPosition` in `src/lib/video/player-events.ts` computes the
metric the server stores as `maxWatchedPercentage` as:

```
maxWatchedPercentage = furthest validated playback position / canonical duration
```

The denominator is the canonical server duration. A client-supplied percentage
is accepted on the wire for compatibility and then ignored — the server always
recomputes it. `shouldAutoComplete` in `src/lib/utils/progress.ts` completes a
lesson at `>= 0.9`.

Read the numerator literally: it is the furthest position reached, not the sum
of time actually spent watching. A learner who seeks straight to the end
reports the same value as one who watched every second. Two consequences:

- **Seeks can over-report.** Skipping ahead inflates the metric. Nothing in the
  MVP corrects for it.
- **The 90% gate is safe but approximate.** It is a floor for "reached the end
  region", not evidence of comprehension. Do not build grading, certificates, or
  "time spent" reporting on top of this column without replacing it with an
  accumulated, seek-aware watch-time measurement.

If you need a real watch-time number, that is a schema change plus a new writer
— not a change to the client event handler.

## Cache Components

`next.config.ts` sets `cacheComponents: true`. Three things follow.

1. **A route is dynamic unless everything it renders is cacheable.** Reading
   cookies, headers, or search params, or awaiting an uncached database call,
   makes the route dynamic.

2. **`"use cache"` marks a function, component, or file as cacheable.** It must
   be `async`. The cache key is the build ID, the function's identity, and its
   serialised arguments including anything captured from the enclosing scope.

3. **`"use cache: private"` is a separate directive, not a modifier.** It
   replaces `"use cache"`. It exists solely to let a cached function read
   runtime APIs such as `cookies()` while keeping the result out of the
   cross-request server cache. Stacking the two directives in one function body
   is a bug: the first is then meaningless, and the second opts the whole
   function out of prerendering.

   Use plain `"use cache"` for anything that does not read runtime data. In
   this codebase that is every `"use cache"` in `src/db/queries/courses.ts`,
   `src/lib/content/blog.ts`, and `src/lib/content/docs.ts`.

`connection()` is the explicit opt-out from prerendering. Several routes call it
first thing so a data failure can be caught and rendered as an unavailable
state. Keep it **outside** the `try` block that renders the fallback: if it
throws inside, the dynamic-boundary signal disappears and the page prerenders a
permanent error state instead of retrying per request.

### Tags

Cache tags are declared in `src/lib/cache/tags.ts`:

- `courses` — the published course list
- `course:<id>` — one course, its syllabus, and its previews
- `course-slug:<slug>` — a course looked up by slug

Server actions call `revalidateTag(tag, "max")` after a write, then
`revalidatePath` for the admin screens. The `"max"` profile is required in
Cache Components and marks the entry stale immediately.

If a published course is not updating, the tag it was tagged with and the tag
that was invalidated are different. Compare them before touching anything else.

## Error and loading states

Every dynamic route group ships `loading.tsx` and `error.tsx`. The error
boundary receives a retry control and shows a safe, human message.

The rule: **user-facing copy must never contain a table name, a Stripe field, a
video reference, or an environment variable name.** `tests/e2e/catalog.spec.ts`
and `tests/e2e/error-states.spec.ts` assert this with negative regexes. New
error text must pass those assertions.

## Content pipeline

Markdown in `docs/blog` and `docs/guides` becomes public pages:

1. `src/lib/content/collection.ts` reads a fixed directory and sorts file
   names, so builds are reproducible.
2. `src/lib/content/frontmatter.ts` parses and validates the frontmatter
   block, then builds a slug index and rejects duplicates.
3. `src/lib/content/markdown.ts` renders Markdown to an HTML string. It escapes
   every character before emitting any markup, and only allows in-page
   anchors, site-absolute paths without `..`, and `https://` URLs.
4. `src/components/content/prose.tsx` is the only place that uses
   `dangerouslySetInnerHTML`, and it accepts only the output of step 3.

Never point `Prose` at a string that did not come from `renderMarkdown`.

## Safe-change steps

**Adding a cached read query**

1. Add the query to `src/db/queries/*.ts` with `"use cache"`.
2. Declare the narrowest `cacheTag` set that covers the rows returned.
3. Never read `cookies()` or `headers()` inside it. Pass values as arguments
   instead, or use `"use cache: private"` alone.
4. Add a unit test for the pure helpers, not for the query itself.

**Adding a route that reads the database**

1. Guard with `if (!process.env.DATABASE_URL)` and return an unavailable state.
2. Call `await connection()` outside the `try`.
3. Wrap the query in `try/catch` and return the unavailable state, never throw.
4. Log the real cause through `logServerError` from
   `src/lib/logging/server-error.ts`, not into the rendered copy.
5. Add a `loading.tsx` and an `error.tsx` alongside the route.

**Adding a new public content page**

1. Create the Markdown file in `docs/blog` or `docs/guides` with the exact six
   frontmatter keys.
2. Add or extend a loader in `src/lib/content/`. Never pass a request value
   into `readContentDirectory`.
3. Render the body through `Prose`.

## Verification commands

```bash
bun run typecheck
bun run lint
bun run test
DATABASE_URL="postgres://user:pass@host/db?sslmode=require" bun run build
```

A `use cache` mistake usually shows up only in `next build`, not in
typecheck. Always run the build before opening a pull request that touches a
cached scope.

## Troubleshooting

**Build fails with a cache directive error.** Read the directive name in the
message. `"use cache: private"` cannot be combined with `"use cache"`, and
neither can be used in a non-async function.

**Build fails with a prerender error about dynamic data.** Something in the
static path reads runtime data. Either move the read out of the cached scope
and pass it as an argument, or add `connection()` and accept a dynamic route.

**A page renders the unavailable state forever in production.** `connection()`
was called inside a `try/catch` that swallowed its throw. Move it above the
`try`.

**Client component receives a function it cannot serialise.** Something marked
`"use client"` was passed a server function. Move the data fetch to the server
component and pass a plain object.

## Next

- [Page map](#page-map)
- [Database](#database)
- [Authentication and billing](#authentication-and-billing)
- [Components](#components)
- [Troubleshooting](#troubleshooting)
