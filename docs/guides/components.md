---
title: "Components"
description: "The component layering, the client boundary, the design tokens, and the accessibility rules the existing components already follow."
slug: "components"
publishedAt: "2026-03-02"
readingTime: "7 min read"
tags: ["components", "design-system", "accessibility"]
---

## Purpose

Describe the component layers, when a component is allowed to be a client
component, and the conventions to follow so a new component matches the
existing ones.

## Layers

| Directory | Role | May import |
| --- | --- | --- |
| `src/components/ui/` | Presentational primitives | `src/components/ui`, `cn` |
| `src/components/layout/` | Site chrome | `ui`, `src/lib` |
| `src/components/catalog/` | Public course surface | `ui`, `layout`, `src/lib` |
| `src/components/learning/` | Lesson player and timeline | `ui`, `layout`, `src/lib` |
| `src/components/dashboards/` | Student dashboard widgets | `ui`, `layout`, `src/lib` |
| `src/components/admin/` | Admin editors | `ui`, `src/actions`, `src/lib` |
| `src/components/content/` | Markdown typography | `src/lib/content` |
| `src/components/motion/` | Reveal and hero animation | `ui` |

`ui` never imports from a feature folder. That is what keeps the primitives
reusable and free of feature knowledge.

`cn` comes from the `cn` package and is the only class-merging helper. Do not
introduce `clsx` or `tailwind-merge` directly.

## `src/components/ui/`

Available primitives: `badge`, `button`, `card`, `dialog`, `input`, `label`,
`select`, `skeleton`, `table`, `tabs`, and `textarea`.

They are local, not imported from a component library at runtime. `button` uses
`class-variance-authority` for variants. Extend an existing primitive rather
than writing a new one for a single use.

## The client boundary

The default is a Server Component. A component needs `"use client"` only for
state, effects, refs, or event handlers.

Current client components:

| Component | Why |
| --- | --- |
| `admin/course-form.tsx` | `useActionState`, form state, router navigation |
| `admin/module-editor.tsx` | Local edit state and reorder interaction |
| `admin/lesson-editor.tsx` | Local edit state and field-level validation |
| `admin/course-actions.tsx` | Status transitions and confirmations |
| `catalog/course-filters.tsx` | Search and category state in the query string |
| `catalog/purchase-card.tsx` | Checkout action state |
| `catalog/public-preview-player.tsx` | Embed lifecycle |
| `learning/video-player.tsx` | Player events, position saving |
| `learning/completion-control.tsx` | Completion action state |
| `motion/reveal.tsx`, `motion/hero-motion.tsx` | Animation and reduced-motion |

Everything else composes these from the server.

### Rules for a client component

1. It must not import `src/db`, `@clerk/nextjs/server`, or the Stripe client.
2. It must not read `process.env` values that are not `NEXT_PUBLIC_`.
3. It receives plain serialisable props. A server function prop will fail to
   serialise.
4. It calls a `"use server"` action rather than importing a repository directly.

## Data flow

Server Component → fetches or props → client leaf widget → server action →
repository → cache invalidation → `revalidatePath` refreshes the server
component tree.

The client widget never optimistically claims data changed. After a successful
action, the server action revalidates the paths and the server component
re-renders with real data. This is why the admin editors do not keep a local
copy of the course.

## Design tokens

`src/styles/tokens.css` defines the colour and type scale; Tailwind 4 consumes
them. `src/styles/animations.css` holds keyframes.

Rules:

- Use the semantic token names. `bg-background`, `text-foreground`,
  `text-muted-foreground`, `bg-primary`, `text-primary`, `bg-secondary`,
  `bg-muted`, `border-border`, `bg-card`. Do not introduce a raw hex value in a
  component.
- Serif is for display type: `font-serif` on headings and marketing copy.
- `Reveal` handles scroll entrance animation. Do not add a new scroll listener.
- Every animation must respect reduced motion. `ReducedMotionProvider` is
  mounted in the root layout, and `Reveal` reads it. A new animated component
  must do the same.

`tests/unit/styles/design-tokens.test.ts` asserts the token set. Run it after
touching `tokens.css`.

## Content typography

`src/components/content/prose.tsx` is the only component allowed to use
`dangerouslySetInnerHTML`, and only with the output of `renderMarkdown` from
`src/lib/content/markdown.ts`. The renderer escapes every character before
emitting markup and allow-lists every URL, so raw HTML in a Markdown file
renders as visible text.

If you need a new element in a guide, add it to the renderer and to
`PROSE_CLASSES`, with a test in `tests/unit/content/markdown.test.ts`. Do not
inject a class name from the Markdown source.

## Accessibility rules the existing code follows

1. **One `h1` per page.** Section headings descend from there.
2. **Landmarks.** Every navigation has an accessible name: `aria-label="Admin
   navigation"`, `aria-label="Mobile navigation"`.
3. **Icon-only controls carry a name.** The mobile menu toggle is
   `aria-label="Open navigation menu"`.
4. **Decorative icons are hidden.** `aria-hidden="true"` on every Lucide icon
   that sits next to text.
5. **Focus returns.** Escape in the mobile menu closes it and returns focus to
   the toggle. `tests/e2e/landing.spec.ts` asserts both halves of that.
6. **Filters are labelled.** The catalogue search is
   `getByRole("search", { name: "Filter courses" })` with a labelled input.
7. **Error copy is plain.** `RetryButton` gives a retry action; the message
   never contains a table name, a Stripe field, a video reference, or an
   environment variable name.
8. **Loading states are announced by the boundary**, not by custom live regions.

## Safe-change steps

**Adding a UI primitive**

1. Add it to `src/components/ui/` and only import from that folder.
2. Forward every native prop. If it is a form control, accept and forward `ref`.
3. Use `cn()` to merge the caller's `className` last so it can override.
4. Use semantic tokens only.
5. Verify focus order, keyboard operation, and reduced-motion behaviour by hand.

**Adding a feature component**

1. Decide server or client first. Default to server.
2. If it is a client, check the four client rules above.
3. Keep it presentational if possible: take data as props and let the page
   decide where it comes from.
4. If it renders a data state, include a loading state, an empty state, and an
   unavailable state with a retry.

**Changing an existing component**

Read the tests that cover it first. `tests/e2e/error-states.spec.ts`,
`tests/e2e/landing.spec.ts`, and the access specs assert specific accessible
names and safe copy. Renaming an accessible name is a breaking change for those
tests, and those tests are the contract.

## Verification commands

```bash
bun run test tests/unit/styles
bun run typecheck
bun run lint
bunx playwright test tests/e2e/landing.spec.ts tests/e2e/error-states.spec.ts
```

Then open the page in a browser and tab through it. Automated checks catch
missing names; they do not catch a bad focus order.

## Troubleshooting

**A client component fails to build with a serialization error.** A prop is a
function, a `Date` from a non-serialisable source, or a class instance. Move
the computation to the server component and pass a plain value.

**A prop is `undefined` on a client component that renders on the server.** The
server component did not pass it. Do not reach for an environment variable in
the client as a workaround.

**A colour does not change when the token changes.** A raw hex or a Tailwind
default palette class is set somewhere in the tree. Search for the literal
value.

**An animation still runs with reduced motion enabled.** The component animated
without going through `Reveal` or without reading the reduced-motion context.

**`Prose` renders raw HTML tags as text.** That is the renderer working. It is
deliberate: the renderer has no HTML passthrough. Use Markdown.

**A new element in a guide does not render.** `renderMarkdown` only supports
the constructs it implements. Add the construct, add the `PROSE_CLASSES` rule,
and add a unit test.

## Next

- [Architecture](architecture.md)
- [Adding a course](adding-a-course.md)
- [Troubleshooting](troubleshooting.md)
