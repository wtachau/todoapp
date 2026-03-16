# Build Plan

## Current State
- SvelteKit + Auth.js (Google OAuth) + Prisma 5 + Postgres
- Schema: User, Account, Session, Team, TeamMember, Project, Task, TaskGenerator
- Auth working, basic task CRUD on dashboard
- Personal team auto-created on first login
- Deployed to shared-tasks.app on Vercel + Supabase
- Step 1 complete: TaskGenerator schema + CRUD on project page (day checkboxes + advanced RRULE input, round-robin with start person, fixed assignee)
- Step 2 complete: `POST /api/generate-tasks` endpoint (auth-gated in prod, open in dev)
- Step 3 complete: GitHub Actions workflow at `.github/workflows/generate-tasks.yml` (every 15 min)
- Local dev: `npm run dev:local` runs Vite + cron loop together via concurrently
- Step 4 complete: Dashboard shows flat task list across all projects; partner view at `/dashboard/users/[id]`
- Step 5 complete: One-off task creation with assignee picker already existed on project page
- TaskStatus enum (todo/in_progress/done) added; status + completedAt kept in sync

## Pending setup (needs to be done once)
- Add `CRON_SECRET` env var to Vercel dashboard
- Add `CRON_SECRET` as a GitHub Actions secret (repo Settings → Secrets → Actions)

## Key Concepts
- **Personal team**: auto-created on signup, invisible to anyone else
- **Shared team**: multiple members; partners can see each other's tasks within it
- **Task**: a concrete to-do item assigned to one person
- **Task Generator**: defines a recurring task; creates Task instances on a schedule
- **Assignment modes**: `fixed` (always the same person) or `round_robin` (alternates each time a task is created)
- **Per-day assignment**: not a feature — handle by creating two generators with the same title, different days, and different fixed assignees (e.g. you on weekends, partner on weekdays)
- **Round-robin flip**: happens at task *creation*, not completion
- **Dashboard**: shows only MY tasks, all projects/teams collapsed into one list
- **Partner view**: their tasks in shared teams only (not their personal team)

## Schema Changes Needed

### Step 6 — Snooze
Add to `Task`:
- `snoozedUntil` DateTime?

---

## Build Steps

### Step 1 — Task Generator schema + CRUD
- Add `TaskGenerator` model and migration; add `generatorId` to `Task`
- UI within a project page to create/edit/delete generators
- Recurrence UI: day-of-week checkboxes + frequency selector (daily/weekly/monthly)
- "Advanced" toggle for raw RRULE string input
- Uses `rrule` npm package to parse rules and compute `nextRunAt`
- Minimal read-only task list on the project page so generated tasks are visible

### Step 2 — Task generation logic + endpoint
- Server route `POST /api/generate-tasks`
- Queries generators where `nextRunAt <= now()`
- For each: creates a Task (with `createdAt` set to `nextRunAt`, not now), advances `nextRunAt`, updates `lastAssignedTo` if round_robin
- Round-robin: looks at team members, picks the one who is NOT `lastAssignedTo`
- **Auth**: validates `Authorization: Bearer CRON_SECRET`; in development (`NODE_ENV=development`), skips the check so you can trigger it with a plain curl or a dev button in the UI

### Step 3 — GitHub Actions cron
- Free alternative to Vercel cron (stays on Vercel Hobby plan)
- Scheduled workflow runs every 15 minutes, curls `POST /api/generate-tasks` with the secret header
- 15-minute granularity handles intra-day tasks and snooze wake-ups (worst case ~15 min late)
- `CRON_SECRET` stored as a GitHub Actions secret and in Vercel env vars
- **Why not Vercel cron**: requires Pro plan ($20/mo); GitHub Actions is free

### ~~Step 4~~ ✓ Task visibility
### ~~Step 5~~ ✓ One-off task assignment

### Step 6 — Snooze ✓
- `snoozedUntil DateTime?` added to Task
- Dashboard filters out snoozed tasks; presets (tomorrow, 3 days, 1 week) + date input
- `/dashboard/snoozed` page with un-snooze
- All times set to 9am PT via date-fns-tz

### Step 7 — Polish
- Project/team filter on dashboard
- Mark complete inline (quick checkbox, not just dropdown)
- Completed tasks view

### Step 8 — Task age color indicator
- Tasks fade green → red based on how long they've been active (since `createdAt` or since last status change)
- Configurable urgency window per task generator (e.g. "should be done within 3 days")
- One-off tasks get a default urgency window (TBD — configurable at project or team level?)
- Color computed client-side from age vs urgency window; no extra DB queries
- Questions to answer before building:
  - Where is urgency window configured? Per generator, per project, or per task?
  - What's the default for one-off tasks?
  - Does the clock reset when status changes to `in_progress`?
