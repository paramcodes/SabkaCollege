---
title: "Getting started"
description: "Install the toolchain, get the dev server running, and verify a clean checkout before you change anything."
slug: "getting-started"
publishedAt: "2026-03-02"
readingTime: "5 min read"
tags: ["onboarding", "tooling"]
---

## Purpose

Get a fresh clone to a running dev server and a green quality run, so that when
something breaks later you know it was your change and not your setup.

This guide assumes a fresh checkout on Linux or macOS with a POSIX shell. The
repository uses Bun for every script; do not substitute npm, pnpm, or yarn.

## Requirements

| Requirement | Version | Check with |
| --- | --- | --- |
| Bun | 1.4 or newer | `bun --version` |
| Node | 22 LTS | `node --version` (Next.js toolchain) |
| PostgreSQL | 15 or newer | `psql --version` |
| Chrome (screenshots, e2e) | any recent | `google-chrome --version` |

`package.json` pins `"packageManager": "bun@1.4.2"`. Corepack will use that
version for you if you have it enabled.

## File map

| Path | Purpose |
| --- | --- |
| `package.json` | Scripts, dependency versions, package manager pin |
| `bun.lock` | The only lockfile. Never hand-edit it |
| `tsconfig.json` | Path alias `@/*` -> repo root, strict mode |
| `next.config.ts` | `cacheComponents: true`; the only Next config |
| `vitest.config.ts` | Unit test include glob and the `@` alias |
| `playwright.config.ts` | E2E test dir, dev server command, browser project |
| `bunfig.toml` | Excludes `tests/e2e/**` from the unit test run |
| `drizzle.config.ts` | Points drizzle-kit at `src/db/schema/index.ts` |
| `.env.example` | The full list of environment variable names |
| `proxy.ts` | Clerk middleware and the protected route matcher |
| `docs/superpowers/` | Planning and design documents. Preserve these |

## Data flow

There is no data flow yet, and that is the point. The starting state is:

1. `bun run dev` starts `next dev` on port 3000.
2. The root `app/layout.tsx` applies the global stylesheet and fonts.
3. `(marketing)/page.tsx` renders static content from
   `src/lib/content/landing.ts`.

The public catalogue routes check `process.env.DATABASE_URL` before touching the
database and degrade to an explicit "temporarily unavailable" state instead of
crashing, but `src/db/index.ts` throws at module load when the variable is
missing. A **development `DATABASE_URL` is therefore required** for the dev
server, the test suite, and `bun run build`.

## Safe-change steps

### Install dependencies

```bash
bun install
```

Commit `bun.lock` whenever it changes. Do not run two package managers against
this repository; the lockfile is not portable between them.

### Configure environment

```bash
cp .env.example .env.local
```

Fill in `DATABASE_URL`, `CLERK_SECRET_KEY`, and
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`. `.env.local` is already covered by
`.gitignore` — confirm with `git status` before you commit anything else.

You can work on the marketing surface with no secrets at all, because nothing
in `(marketing)` touches Clerk or Postgres. See [deployment](#deployment) for
the full variable list.

### Start the dev server

```bash
bun run dev
```

Then open <http://localhost:3000>.

## Screenshots

| View | Image |
| --- | --- |
| SabkaCollege landing page | ![SabkaCollege landing page](/docs/screenshots/landing-page.png) |
| Course catalogue | ![Course catalogue](/docs/screenshots/courses-page.png) |
| Teammate guides | ![Teammate guides](/docs/screenshots/docs-page.png) |

These five public screenshots are served from `/docs/screenshots/...` — the
repository keeps a `docs/guides/` set for review and a mirrored copy under
`public/docs/screenshots/` so the app can serve them. The nine guides in
`docs/guides/` are all rendered on the docs index.

### Run the quality suite before you edit anything

```bash
bun run test
bun run typecheck
bun run lint
```

All three must pass on a clean checkout. If any fails before your change, stop
and fix or report it — do not start work on a broken baseline.

## Verification commands

```bash
# Unit tests (Vitest, tests/unit only)
bun run test

# One file
bun run test -- tests/unit/auth/roles.test.ts

# Types
bun run typecheck

# Lint
bun run lint

# Production build. Needs a real DATABASE_URL at build time.
DATABASE_URL="postgres://user:pass@host/db?sslmode=require" bun run build

# Browser tests. Starts its own dev server; no DATABASE_URL required.
bunx playwright test
```

`bun run test` is the project suite (Vitest). To run one file, pass it after
`--`: `bun run test -- tests/unit/auth/roles.test.ts`. `bunfig.toml` keeps
`tests/e2e/**` out of the unit run.

## Troubleshooting

**`bun install` fails on postinstall scripts.** `package.json` lists `sharp`
and `unrs-resolver` in `trustedDependencies`. If your Bun version is older than
1.1.16 it will not honour that field and will skip the scripts instead. Upgrade
Bun.

**`bun run dev` exits with a DATABASE_URL error.** That message comes from
`src/db/index.ts`, which throws at module load when the variable is missing. It
is expected when you import a database module without configuring the database.
Set `DATABASE_URL` in `.env.local`.

**`bun run typecheck` reports errors in `.next/types`.** Run `bun run dev` once
so Next generates its route types, or run a build first. The generated types
directory is in `tsconfig.json` and is not checked in.

**Port 3000 is already in use.** `bun run dev -- --port 3001`. Note that
`playwright.config.ts` hard-codes `127.0.0.1:3000` in its `baseURL`; if you
move the dev server, move the config too or your e2e run will test nothing.

**ESLint reports a `react-hooks` error you did not introduce.** Run
`bun run lint` on a clean tree first. Rule behaviour changes between ESLint and
`eslint-config-next` versions, and `bun.lock` is the record of which is
installed.

## Next

- [Architecture](#architecture) — how the route groups and layers fit together
- [Page map](#page-map) — every route and what it requires
- [Database](#database) — schema, migrations, and the query layer
