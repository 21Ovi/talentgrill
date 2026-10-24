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

## CI/CD

- **CI** (`.github/workflows/ci.yml`) runs on every pull request and every push to `main`:
  typecheck, lint, migrations and seed run twice against Postgres 18, an append-only check
  on `events`, a production build, and `scripts/smoke.sh` (signup → hint → answers →
  quick feedback, with the agent in stub mode).
- **CD**: `render.yaml` is a Render Blueprint (web service + Postgres in Singapore,
  generated secrets, migrations and seed before each deploy). With
  `autoDeployTrigger: checksPass`, every push to `main` deploys once CI passes.

## Admin

`/admin` shows signups (today and total), where they came from (`?src=`), roles, the interview
funnel and the 25 latest signups with phone numbers partly hidden. It refreshes every 30 seconds.
Sign in with `ADMIN_PASSWORD`; the session is a signed, HTTP-only cookie that lasts 12 hours, and
rotating `ADMIN_COOKIE_SECRET` signs everyone out. Five wrong passwords per IP, then one try a
minute. Logins and failed attempts are written to `events`.

## Audit rules

- Every user, agent, admin and webhook action is written to `events`, which a trigger
  makes append-only (no UPDATE, DELETE or TRUNCATE).
- No seeded users, sessions, answers or payments. Internal and staff accounts are flagged
  and excluded from counts, as are records created in stub mode.
