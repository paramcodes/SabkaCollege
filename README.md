# SabkaCollege

Bun-managed Next.js (App Router) learning platform. This repository currently
contains the project foundation: TypeScript, Tailwind CSS, ESLint, and Vitest
wiring.

## Requirements

- [Bun](https://bun.sh) 1.4 or newer

## Getting started

```bash
bun install
bun run dev
```

The dev server runs at <http://localhost:3000>.

Copy `.env.example` to `.env.local` and fill in the values before the database
and authentication features are wired up.

## Quality commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the development server |
| `bun run build` | Create a production build |
| `bun run start` | Serve the production build |
| `bun run lint` | Lint the project with ESLint |
| `bun run typecheck` | Type-check without emitting files |
| `bun run test` | Run the Vitest suite once |
| `bun run test:watch` | Run the Vitest suite in watch mode |

Database helpers are exposed as `bun run db:generate`, `bun run db:migrate`,
`bun run db:push`, and `bun run db:seed`.
