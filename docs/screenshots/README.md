# Documentation screenshots

These PNGs are the **committed, reviewed** screenshots referenced from the
teammate guides in `docs/guides/`. They are produced by one script, and the
script refuses to write a misleading image.

Regenerate the whole set with:

```bash
bun run screenshots:capture
```

## What is in this directory

| File | Route | Size (px) | Size on disk | What it shows |
| --- | --- | --- | --- | --- |
| `landing-page.png` | `/` | 1440 x 5746 | 557,820 B | The marketing landing page — hero, value props, and the call to action. |
| `pricing-page.png` | `/pricing` | 1440 x 3102 | 288,669 B | The pay-once pricing page, including the "Pay once. Keep your course access." headline. |
| `courses-page.png` | `/courses` | 1440 x 1327 | 106,711 B | **The no-database empty state**, not real catalogue data. See the caveat below. |
| `blog-page.png` | `/blog` | 1440 x 1761 | 151,028 B | The blog index, listing the two published articles from `docs/blog/`. |
| `docs-page.png` | `/docs` | 1440 x 49994 | 7,940,352 B | The full documentation index — every guide in `docs/guides/` rendered. It is a tall page because the index renders all nine guides in full. |

Those numbers are from the run that produced the files currently in the
directory, not from an earlier run. Re-measure after every regeneration; a
changed `docs-page.png` height means the rendered `/docs` page changed, which is
usually a content or heading change rather than noise.

`report.json` is written by the same run and is the machine-readable record of
what was captured, from which route, and what was skipped and why. When you
regenerate the screenshots, regenerate the report in the same run — never edit
it by hand. A run in which nothing changed legitimately rewrites `report.json`
byte-for-byte identically; that is the honest outcome, not a missing update.

## The `/docs` anchor contract

`/docs` renders all nine guides into one document, so heading ids have to be
namespaced or they repeat across guides:

- each `<article>` keeps the **bare guide slug** as its `id`, so
  `#database`, `#deployment`, and every cross-guide link written as `[Database](#database)`
  keep working;
- every heading **inside** a guide is namespaced with the guide slug as a
  prefix, so a "## Database" heading inside `getting-started.md` becomes
  `id="getting-started-database"` rather than a second `id="database"` that
  would shadow the guide anchor above it.

The prefix is applied by `renderMarkdown(source, { idPrefix })` and threaded
through the `<Prose idPrefix>` component. A prefix is slugged with the same rules
as heading text, so it cannot inject anything into the `id` attribute, and an
unsluggable prefix falls back to `section-` rather than silently turning
namespacing off.

All 35 in-page anchor links across the nine shipped guides resolve under this
contract, because every one of them targets a guide-level anchor, not a heading
inside a guide. `tests/unit/content/markdown.test.ts` pins both facts: the
whole page has a duplicate-free id space with the prefix, and would collide
without it.

## How the capture works

`scripts/capture-docs-screenshots.ts`:

- uses a **fixed viewport** of 1440 x 900 with `deviceScaleFactor: 1` and
  `reducedMotion: "reduce"`, and disables animations and transitions before
  shooting, so two runs of the same commit produce comparable output;
- captures **full-page** images;
- starts its own dev server on `127.0.0.1:3010` with an **allow-listed
  environment** — only `PATH`, `HOME`, and the placeholder Clerk test keys. A
  spawned child would otherwise inherit your real `DATABASE_URL`,
  `CLERK_SECRET_KEY`, and `STRIPE_SECRET_KEY` from your shell, and no
  documentation screenshot should depend on production data;
- treats a page as real only when the navigation succeeded, the status was
  below 400, and the expected text is visible. Anything else is reported as
  `skipped` with a reason and **no file is written**;
- exits non-zero if the browser cannot be found, so a machine that cannot take
  the screenshots never silently leaves an old set behind looking fresh.

## The system Chrome resolver

This repository does **not** vendor a Playwright browser download: there is no
`playwright install` step in setup, and `~/.cache/ms-playwright` is empty on a
clean checkout. A stock `devices["Desktop Chrome"]` project therefore fails to
launch with `Executable doesn't exist`.

`scripts/system-chrome.ts` is the single place that knows how to find a
browser. Resolution order:

1. `PLAYWRIGHT_CHROME_EXECUTABLE`, then `CHROME_PATH`.
2. A fixed list of well-known install locations (Debian/Ubuntu Google Chrome and
   Chromium, the snap wrapper, Fedora/RHEL paths, and the macOS `.app` bundles).

A candidate only counts when `statSync` says it is a file (following symlinks,
which is what makes `/usr/bin/google-chrome` work — it is an alternatives
symlink) **and** `accessSync` confirms it is executable. A dangling symlink, a
directory, or a non-executable stub returns `null` so callers can skip
honestly instead of failing with a launch error.

Both `playwright.config.ts` and `scripts/capture-docs-screenshots.ts` consume
this one resolver, so the test suite and the capture script can never disagree
about whether a browser exists.

**When Chrome is missing, nothing claims a pass it did not earn.**
`tests/e2e/screenshots.spec.ts` calls `test.skip(!systemChrome, …)` at module
scope with the reason from `SYSTEM_CHROME_MISSING_REASON`, so the browser
tests are reported as *skipped* rather than green. The capture script prints
the same reason, writes nothing, and exits non-zero. Tests that do not need a
browser are unaffected — Vitest never reads `playwright.config.ts`.

To point at a browser yourself:

```bash
PLAYWRIGHT_CHROME_EXECUTABLE=/path/to/chrome bunx playwright test tests/e2e/screenshots.spec.ts
```

## Routes that are deliberately skipped

No authenticated screenshot is ever fabricated, and no page whose real content
lives in Postgres is screenshotted empty. Each of these is reported in
`report.json` under `skipped` with its reason:

| Route | Why it is skipped |
| --- | --- |
| `/dashboard` | Requires a signed-in Clerk session. |
| `/admin` | Requires a signed-in Clerk session **and** an admin role. |
| `/sign-in`, `/sign-up` | Clerk-hosted auth screens render third-party UI and need a real tenant to be meaningful. |
| `/courses/[slug]` | Needs a live database row for a published course. |
| `/courses/[slug]/preview/[lesson]` | Needs a live database row for a published lesson. |

The e2e suite asserts the honest alternative for the protected case: it
requests `/dashboard` anonymously and asserts that no dashboard content is ever
rendered. It does **not** assert that a particular sign-in page appears. The
suite runs against the placeholder Clerk tenant, where the provider can respond
with a tenant error instead of a real sign-in page, so the only stable, honest
claim is the negative one: an anonymous request never sees the dashboard. That
is the fact worth pinning, not a screenshot of the protected page.

## Known caveat: `courses-page.png` is the empty state

`/courses` reads from Postgres. The capture runs with no `DATABASE_URL`, so the
route degrades to a designed empty state ("Course catalogue is temporarily
unavailable") instead of erroring. `courses-page.png` is therefore a real
render of the **empty** catalogue, and `report.json` records that fact in a
`note` on the entry. It is not a picture of real course data and should not be
described as one in a guide.

A related limitation: `bun run build` in this repository currently needs a real
`DATABASE_URL`, because the content and catalogue pages are statically
generated at build time. The screenshot capture sidesteps this by using the dev
server, which resolves the database lazily per request.

## How the e2e test relates to these files

`tests/e2e/screenshots.spec.ts` writes to `test-results/screenshots/`, a
gitignored throwaway directory. It is a **smoke test that the pipeline works**,
not the source of the committed images: it uses whatever the web server is
running and writes nowhere near this directory. The reviewed artifacts in this
directory come only from `bun run screenshots:capture`, and reviewing a diff on
`docs/screenshots/*.png` is how you see that a page actually changed.

The test resolves its output directory from `process.cwd()`
(`path.resolve(process.cwd(), "test-results/screenshots")`) rather than
`import.meta.dirname`, which is a Bun/ESM-only property and is `undefined`
under Playwright's own Node-based test registry — that would have resolved every
screenshot to `<cwd>/undefined/...`.

## The `public/docs/screenshots` mirror

The five captured PNGs are copied verbatim into `public/docs/screenshots/` so
the running app can serve them at `/docs/screenshots/<file>.png`. `docs/screenshots/`
is the reviewed source of truth; the mirror is what a reader actually loads in a
guide. Keep the two in sync when the set is regenerated.

Verify everything with:

```bash
bun run typecheck
bun run lint
bun run test
bunx playwright test tests/e2e/screenshots.spec.ts
```
