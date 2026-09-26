# SabkaCollege

A Bun-managed [Next.js](https://nextjs.org) (App Router) learning platform with
Clerk authentication, Stripe one-time course purchases, Drizzle ORM on Neon
Postgres, Vitest unit tests, and Playwright end-to-end tests.

## Requirements

| Tool | Version | Notes |
| --- | --- | --- |
| [Bun](https://bun.sh) | 1.4 or newer | The package manager and task runner. `packageManager` in `package.json` pins `bun@1.4.2`. |
| Node.js | 22 or newer | Required by the Next.js 16 toolchain. |
| Chrome or Chromium | any recent build | Playwright drives the **system** browser. No `playwright install` step exists. |

## Setup

```bash
bun install
cp .env.example .env.local   # then fill in the values
bun run dev
```

The dev server runs at <http://localhost:3000>.

## Environment configuration

Secrets live in `.env.local`, which is git-ignored. **Never commit a secret,
and never paste a real key into a file, a test, a command you will commit, or
a report.** `.env.example` is the committed template and must contain only
empty or placeholder values.

| Variable | Scope | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | server | Neon Postgres connection string. `src/db/index.ts` throws at module load without it, so the build fails too. |
| `CLERK_SECRET_KEY` | server | Clerk backend API key. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | browser | Clerk frontend key. Shipped to every visitor. |
| `CLERK_WEBHOOK_SIGNING_SECRET` | server | Verifies `POST /api/webhooks/clerk`. |
| `CLERK_INITIAL_ADMIN_EMAILS` | server | Comma-separated, email addresses promoted to `admin` at user-sync time. A **local bootstrap only** — see below. Unset or empty promotes nobody. |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | browser | Defaults to `/sign-in`. |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | browser | Defaults to `/sign-up`. |
| `STRIPE_SECRET_KEY` | server | Stripe API key. |
| `STRIPE_WEBHOOK_SECRET` | server | Verifies `POST /api/webhooks/stripe`. |
| `NEXT_PUBLIC_APP_URL` | browser | Absolute origin used to build Stripe redirect URLs. Must match the registered webhook host. |
| `EXTERNAL_VIDEO_ALLOWED_HOSTS` | server | Comma-separated extra hostnames an `external` lesson may embed. Not a secret; the server reads it so a client cannot widen the list. |
| `NEXT_PUBLIC_EXTERNAL_VIDEO_ALLOWED_HOSTS` | browser | Same list, for the browser half. The effective allow-list is the union of this, the server value, and the built-in provider hosts (`www.youtube-nocookie.com`, `player.vimeo.com`, `stream.mux.com`). An `external` lesson whose host is not on that list fails closed and renders no player. |

Anything prefixed `NEXT_PUBLIC_` is delivered to every browser. A secret behind
that prefix is a published secret.

### `CLERK_INITIAL_ADMIN_EMAILS` is a bootstrap, not a role store

The variable is read only on the server, by the user-sync layer
(`src/lib/auth/user-sync.ts`). It is never prefixed with `NEXT_PUBLIC_`,
never serialized into a response, and never reaches the browser. Comparison is
on the trimmed, lower-cased address, so `Owner@Example.com` and
`owner@example.com` are the same entry.

What it does: when a listed address is synced, that user is written as
`admin`. It only ever **promotes** — an address that is not listed takes the
role Clerk reports, so listing someone can never demote an existing admin.

What it is not: it is not the long-term source of truth for roles. **Clerk
public metadata remains authoritative for every account that is not on the
list.** Once an account exists, the durable way to promote or demote it is
`publicMetadata: { role: "admin" | "student" }` in Clerk; the next sync writes
that value into `users.role`. The allow-list exists to get the very first
admins in before any metadata has been set, and a listed address keeps
`admin` on every sync — that is how a bootstrap avoids being clobbered by
still-empty metadata.

Two consequences worth stating plainly:

- A listed address is written as `admin` even if Clerk metadata says
  `student`. The list promotes; it never demotes anyone who is not listed.
- Removing an address from the list does **not** revoke admin by itself. The
  next sync writes whatever Clerk metadata says. If that metadata still says
  `admin`, the user stays an admin; only after the metadata is changed does the
  removal take effect. To revoke access, set the Clerk metadata first.

### Clerk

1. Create a Clerk application and copy the **development** publishable key and
   secret key into `.env.local`.
2. Clerk must know where your app lives. Add `http://localhost:3000` as an
   allowed origin for development and the deployed origin for production, or
   Clerk redirects will fail.
3. Sign-in and sign-up are served by the catch-all Clerk routes at
   `/sign-in` and `/sign-up`.
4. Roles live in Clerk **public metadata** as `{ "role": "admin" | "student" }`.
   That is the long-term source of truth. Granting or revoking admin means
   editing Clerk metadata, never writing `users.role` directly — the next sync
   overwrites it. `CLERK_INITIAL_ADMIN_EMAILS` is a local bootstrap for the
   first admins, described below.
5. Register `https://<your-host>/api/webhooks/clerk` and set
   `CLERK_WEBHOOK_SIGNING_SECRET` from that endpoint's signing secret.

### Stripe

1. Create a Stripe account and set `STRIPE_SECRET_KEY` in `.env.local`.
2. Register `https://<your-host>/api/webhooks/stripe` and set
   `STRIPE_WEBHOOK_SECRET` from that endpoint's signing secret. Subscribe to
   `checkout.session.completed`, `payment_intent.succeeded`, and
   `charge.refunded`.
3. Set `NEXT_PUBLIC_APP_URL` to the same origin. A mismatch sends customers to
   the wrong host after checkout.
4. Store `stripeProductId` and `stripePriceId` on the course row. The price is
   read from the database, never from the request, so a client cannot choose
   what it is charged.
5. Never disable webhook signature verification, including for local testing.
   Forward events with the Stripe CLI instead.

Access is granted by the webhook, not by the browser redirect. A completed
checkout that never delivers an event grants nothing, by design.

### Neon (Postgres)

1. Create a Neon project and copy its pooled connection string into
   `DATABASE_URL`. Use the **pooled** endpoint for a serverless deployment.
2. Apply migrations:

   ```bash
   bun run db:generate   # only when the schema changed; commit the SQL
   bun run db:migrate
   ```

3. `bun run db:push` is a local convenience only. It writes no migration file,
   so it cannot be reviewed or replayed in another environment.
4. `drizzle.config.ts` sets `strict: true`. That prompts on destructive
   changes; it does not prevent them. Read the generated SQL before applying it.

### Seed data

```bash
bun run db:seed
```

`scripts/seed.ts` upserts deterministic fixtures — two published courses, one
draft, five modules, six lessons — with fixed UUIDs and a fixed timestamp.

**Seed policy: never run `bun run db:seed` against a production database.** It
is a development and test fixture. Production data arrives through migrations
and through real purchases.

The fixed IDs are load-bearing: `tests/e2e/admin-access.spec.ts` hard-codes
course `10000000-0000-4000-8000-000000000001`. Do not regenerate them.

## Canonical commands

`bun run test` is the project's test suite (Vitest). `bun test` is Bun's own
runner and silently ignores `vitest.config.ts`; it is not the suite and can
report failures the real suite does not have.

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the development server |
| `bun run build` | Create a production build |
| `bun run start` | Serve the production build |
| `bun run test` | Run the Vitest unit suite once |
| `bun run test -- tests/unit/auth` | Run a subset of the unit suite |
| `bun run test:watch` | Run the unit suite in watch mode |
| `bun run typecheck` | Type-check without emitting files |
| `bun run lint` | Lint with ESLint |
| `bunx playwright test` | Run the Playwright end-to-end suite |
| `bun run screenshots:capture` | Regenerate the committed documentation screenshots |
| `bun run db:generate` | Generate a Drizzle migration from schema changes |
| `bun run db:migrate` | Apply pending migrations |
| `bun run db:push` | Push the schema directly (local only) |
| `bun run db:seed` | Insert the deterministic development fixtures |

### The full quality gate

```bash
bun run test
bun run typecheck
bun run lint
bun run build
bunx playwright test
```

`bun run build` needs a syntactically valid `DATABASE_URL` even though no
connection is opened during prerender, because `src/db/index.ts` throws at
module load. For a local verification build, pass a non-secret placeholder on
the command line so it never touches a file:

```bash
DATABASE_URL="postgres://placeholder:placeholder@127.0.0.1:5432/placeholder?sslmode=disable" \
  bun run build
```

A build made with a placeholder is useful for verification and is **not**
something to deploy.

## Testing

### Unit tests

`bun run test` runs `tests/unit/**/*.test.ts` through Vitest. The specs under
`tests/e2e/**` are excluded by `vitest.config.ts` and `bunfig.toml`.

### End-to-end tests

```bash
bunx playwright test
```

The suite uses the **system** Chrome/Chromium, resolved by
`scripts/system-chrome.ts` (the `PLAYWRIGHT_CHROME_EXECUTABLE` and `CHROME_PATH`
overrides first, then a list of well-known install paths). This repository
vendors no Playwright browser download, so a stock
`devices["Desktop Chrome"]` project would fail to launch. When no system browser
resolves, the browser-dependent tests **skip with that reason** instead of
reporting a pass they did not earn.

`playwright.config.ts` starts its own dev server with a placeholder Clerk
publishable key and no `DATABASE_URL`, so the suite never needs real
credentials or a live database.

#### Auth-redirect tests require a real Clerk tenant

The placeholder publishable key in `playwright.config.ts` is a syntactically
valid Clerk **development** key: it resolves to a real Clerk dev instance. The
auth-redirect assertions in `admin-access.spec.ts`, `dashboard-access.spec.ts`,
`learning-access.spec.ts`, and the "authentication boundaries" block in
`error-states.spec.ts` therefore measure Clerk's own redirect behaviour, not
this repository's, and are gated on `CLERK_E2E_REAL_INSTANCE`, which
`playwright.config.ts` sets to `0`.

On a default run those tests **skip with a stated reason**. The public,
no-database, and error-state tests still run and still assert real behaviour.
To exercise the redirects you need a real Clerk test tenant and its keys.
`CLERK_E2E_REAL_INSTANCE=1` makes `playwright.config.ts` **inherit** the two
keys from your environment instead of injecting the placeholders; a run with
`1` and a missing key stops immediately with an error rather than starting a
suite that would measure the wrong tenant:

```bash
CLERK_E2E_REAL_INSTANCE=1 \
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_<real-test-tenant> \
CLERK_SECRET_KEY=sk_test_<real-test-tenant> \
bunx playwright test tests/e2e/dashboard-access.spec.ts
```

The keys are read from the environment. They are never interpolated into the
dev-server command, never printed, and never written to a file. In this mode
`DATABASE_URL` is still unset, so no test can reach a live database.

Live redirect verification is a manual acceptance check in
[`docs/guides/release-checklist.md`](docs/guides/release-checklist.md). Do not
report those tests as passing without a real tenant.

## Deployment prerequisites

1. Node 22 or newer, and `bun install --frozen-lockfile`.
2. All server variables from the table above set in the deployment platform.
3. Clerk allowed origins include the deployed host.
4. Both webhook endpoints registered over HTTPS with the matching signing
   secrets.
5. `bun run db:migrate` applied as a **separate release step, before** the new
   version serves traffic.
6. No `bun run db:seed` against production.
7. A real purchase round-trip verified after deploy. It is the only check that
   proves the webhook is registered and the signing secret matches.

Full detail, build warnings, and the post-deploy smoke list are in
[`docs/guides/deployment.md`](docs/guides/deployment.md).

## Documentation

- [`docs/guides/`](docs/guides/) — teammate guides, rendered at `/docs`
- [`docs/blog/`](docs/blog/) — blog posts, rendered at `/blog`
- [`docs/screenshots/`](docs/screenshots/) — committed documentation screenshots
- [`docs/guides/release-checklist.md`](docs/guides/release-checklist.md) — the
  manual live acceptance checks
- [`docs/guides/troubleshooting.md`](docs/guides/troubleshooting.md) — symptom-first
  diagnosis
