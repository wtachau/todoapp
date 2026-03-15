# Claude Guidance

## Stack
- **Framework**: SvelteKit with Vercel adapter
- **Auth**: Auth.js (`@auth/sveltekit`) with Google OAuth, Prisma adapter, database sessions
- **Database**: Prisma 5 + Postgres (local dev) / Supabase (production)
- **Deployment**: Vercel → shared-tasks.app

## Running Locally
```bash
source ~/.nvm/nvm.sh && nvm use 20
npm run dev
```
Node 20 is required (project was installed under Node 20).

## Database
- Local: `postgresql://localhost:5432/todoapp`
- Migrations: `npx prisma migrate dev --name <name>`
- Reset: `npx prisma migrate reset --force`
- After schema changes, run `npx prisma generate`

## Key Conventions
- All IDs are UUIDs using `@default(dbgenerated("gen_random_uuid()")) @db.Uuid`
- Never use nested Prisma creates when the parent uses `dbgenerated` IDs — do two separate inserts instead
- Server-only DB access: `src/lib/server/prisma.ts`
- Auth session available via `locals.auth()` in server files; `session.user.id` is the user's UUID
- `directUrl` is set in schema for Supabase (pooled URL for queries, direct for migrations)

## Auth
- `src/auth.ts` — Auth.js config, Google provider, Prisma adapter
- `src/hooks.server.ts` — protects routes, redirects unauthenticated users to `/`
- On first login, `createUser` event auto-creates a personal Team for the user

## Project Structure
- `src/routes/dashboard/` — main app, requires auth
- `src/lib/server/` — server-only utilities (prisma client, etc.)
- `prisma/schema.prisma` — source of truth for DB schema
- `PLAN.md` — current build plan, refer to this for next steps

## Build Philosophy
- Build step by step per PLAN.md — one step at a time, commit and push before moving on
- Don't add features beyond the current step
- Keep UI simple and functional — no polish until Step 7
