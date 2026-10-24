# TalentGrill AI

An AI interviewer that makes freshers practise answering out loud, helps them when they
freeze, and issues a human-verified "Interview-Ready" certificate they can share.
Built live at Airtribe AI Builders Day (Track 01: AI for Learning).

## Stack

Next.js 16 (App Router, route handlers) · TypeScript strict · Tailwind 4 · PostgreSQL via
`pg` with raw SQL · zod · Render (Singapore). Vendors: AgenticOrg (agent and human
approval), Pine Labs (payments), ElevenLabs (voice), Vobiz (calls).

## Run locally

```bash
cp .env.example .env.local   # then fill in the blanks
createdb talentgrill_dev
npm install
npm run db:migrate && npm run db:seed
npm run dev
```

`GET /api/health` reports the database and each integration's mode.

## Scripts

| Script | What it does |
|---|---|
| `npm run db:migrate` | Applies `db/migrations/*.sql` in order, tracked in `schema_migrations` |
| `npm run db:seed` | Upserts the question bank (the only seed data allowed) |
| `npm run check` | Typecheck and lint |

## Deploy

`render.yaml` is a Render Blueprint: it creates the web service and Postgres, generates
secrets, and runs migrations and the seed before each deploy. Pushes to `main` deploy.

## Audit rules

- Every user, agent, admin and webhook action is written to `events`, which a trigger
  makes append-only (no UPDATE, DELETE or TRUNCATE).
- No seeded users, sessions, answers or payments. Internal and staff accounts are flagged
  and excluded from counts, as are records created in stub mode.
