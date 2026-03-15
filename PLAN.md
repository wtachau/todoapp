# Build Plan

## Current State
- SvelteKit + Auth.js (Google OAuth) + Prisma 5 + Postgres
- Schema: User, Account, Session, Team, TeamMember, Project, Task
- Auth working, basic task CRUD on dashboard
- Personal team auto-created on first login
- Deployed to shared-tasks.app on Vercel + Supabase

## Key Concepts
- **Personal team**: auto-created on signup, invisible to anyone else
- **Shared team**: multiple members; partners can see each other's tasks within it
- **Task**: a concrete to-do item assigned to one person
- **Task Generator**: defines a recurring task; creates Task instances on a schedule
- **Assignment modes**: `fixed` (always the same person) or `round_robin` (alternates each time a task is created)
- **Round-robin flip**: happens at task *creation*, not completion
- **Dashboard**: shows only MY tasks, all projects/teams collapsed into one list
- **Partner view**: their tasks in shared teams only (not their personal team)

## Schema Changes Needed

### Step 3 — Task Generator
Add `TaskGenerator` model:
- `id` UUID
- `title` String
- `projectId` UUID → Project
- `assignmentMode` enum: `fixed` | `round_robin`
- `fixedAssignee` UUID? → User (used when mode is `fixed`)
- `lastAssignedTo` UUID? → User (used by round_robin to track who got last task)
- `recurrenceRule` String (RRULE string, e.g. `FREQ=WEEKLY;BYDAY=MO,WE,FR`)
- `nextRunAt` DateTime
- `createdAt` DateTime

### Step 6 — Snooze
Add to `Task`:
- `snoozedUntil` DateTime?

### Future
Add to `Task`:
- `generatorId` UUID? → TaskGenerator (to link a task back to its generator)

---

## Build Steps

### Step 1 — Task visibility (UI only, no schema changes)
- Dashboard shows all tasks assigned to me, across all projects/teams, in one flat list
- Each task shows project name + team name as context
- Add "View [partner]'s tasks" link that shows their tasks in shared teams only
- Filter: hide completed tasks by default, toggle to show them

### Step 2 — One-off task assignment
- When creating a task, show a dropdown of team members to assign to
- Assignee is required (already in schema)
- Supports assigning to self or partner in a shared team

### Step 3 — Task Generator schema + CRUD
- Add TaskGenerator model and migration
- UI to create/edit/delete generators within a project
- Recurrence UI: day-of-week checkboxes + frequency selector (daily/weekly/monthly)
- "Advanced" toggle for raw RRULE string input
- Uses `rrule` npm package to parse rules and compute `nextRunAt`

### Step 4 — Task generation logic
- Server route `POST /api/generate-tasks` (protected by secret header)
- Queries generators where `nextRunAt <= now()`
- For each: creates a Task, advances `nextRunAt`, updates `lastAssignedTo` if round_robin
- Round-robin: looks at team members, picks the one who is NOT `lastAssignedTo`

### Step 5 — Vercel cron
- Add `vercel.json` cron that hits `/api/generate-tasks` nightly
- Route validates `Authorization: Bearer CRON_SECRET` header
- Add `CRON_SECRET` to Vercel env vars

### Step 6 — Snooze
- Add `snoozedUntil DateTime?` to Task schema
- Dashboard query filters out tasks where `snoozedUntil > now()`
- Snooze options: later today, tomorrow, next week, pick a date
- Nightly cron also wakes snoozed tasks (or just rely on the query filter)

### Step 7 — Polish
- Overdue indicators (tasks with no completedAt and createdAt is old)
- Project/team filter on dashboard
- Mark complete inline
- Completed tasks view
