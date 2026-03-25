import { prisma } from '$lib/server/prisma';
import { getUserId } from '$lib/server/auth';
import { projectWithMembers } from '$lib/server/queries';
import { fail } from '@sveltejs/kit';
import { fromZonedTime } from 'date-fns-tz';
import type { Actions, PageServerLoad } from './$types';

const TZ = 'America/Los_Angeles';

function at9amPT(daysFromNow: number): Date {
	const d = new Date();
	d.setDate(d.getDate() + daysFromNow);
	return fromZonedTime(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0, 0), TZ);
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = await getUserId(locals);
	const showDone = url.searchParams.get('showDone') === 'true';

	const now = new Date();

	const baseWhere = {
		assignedTo: userId,
		OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }]
	};

	const taskInclude = {
		project: { include: { team: { include: { members: true } } } },
		generator: { select: { nextRunAt: true } }
	};

	const [activeTasks, doneTasks, teams, currentUser] = await Promise.all([
		prisma.task.findMany({
			where: { ...baseWhere, status: { not: 'done' } },
			include: taskInclude,
			orderBy: { createdAt: 'desc' }
		}),
		showDone
			? prisma.task.findMany({
					where: { ...baseWhere, status: 'done' },
					include: taskInclude,
					orderBy: { completedAt: 'desc' }
				})
			: Promise.resolve([]),
		prisma.team.findMany({
			where: { members: { some: { userId } } },
			include: {
				projects: { orderBy: { createdAt: 'desc' } },
				members: { include: { user: true } }
			}
		}),
		prisma.user.findUnique({ where: { id: userId }, select: { urgencyDays: true, defaultProjectId: true } })
	]);

	// Distinct projects from active tasks (for filter chips)
	const allProjects = [...activeTasks, ...doneTasks]
		.map((t) => t.project)
		.filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
		.sort((a, b) => a.name.localeCompare(b.name));

	// Shared team members (excluding self) for partner links
	const partners = teams
		.filter((t) => t.members.length > 1)
		.flatMap((t) => t.members.filter((m) => m.userId !== userId).map((m) => m.user))
		.filter((u, i, arr) => arr.findIndex((x) => x.id === u.id) === i);

	const accessibleProjects = teams.flatMap((t) => t.projects);
	const defaultProjectId = currentUser?.defaultProjectId ?? accessibleProjects[0]?.id ?? null;

	return {
		activeTasks,
		doneTasks,
		allProjects,
		accessibleProjects,
		defaultProjectId,
		teams,
		partners,
		showDone,
		urgencyDays: currentUser?.urgencyDays ?? 3
	};
};

export const actions: Actions = {
	createTask: async ({ request, locals }) => {
		const userId = await getUserId(locals);
		const data = await request.formData();
		const title = (data.get('title') as string)?.trim();
		const projectId = data.get('projectId') as string;
		const scheduledFor = data.get('scheduledFor') as string | null;

		if (!title) return fail(400, { error: 'Title is required' });

		const project = await prisma.project.findUnique({
			where: { id: projectId },
			include: projectWithMembers
		});
		if (!project) return fail(404, { error: 'Project not found' });
		if (!project.team.members.some((m) => m.userId === userId))
			return fail(403, { error: 'Forbidden' });

		let snoozedUntil: Date | null = null;
		if (scheduledFor) {
			const [year, month, day] = scheduledFor.split('-').map(Number);
			snoozedUntil = fromZonedTime(new Date(year, month - 1, day, 9, 0, 0), TZ);
		}

		await prisma.task.create({ data: { title, projectId, assignedTo: userId, snoozedUntil } });
		await prisma.user.update({ where: { id: userId }, data: { defaultProjectId: projectId } });
	},

	createProject: async ({ request, locals }) => {
		const session = await locals.auth();
		const userId = session!.user!.id!;
		const data = await request.formData();
		const name = (data.get('name') as string)?.trim();
		const teamId = data.get('teamId') as string;

		if (!name) return fail(400, { error: 'Name is required' });

		const membership = await prisma.teamMember.findUnique({
			where: { teamId_userId: { teamId, userId } }
		});
		if (!membership) return fail(403, { error: 'Forbidden' });

		await prisma.project.create({ data: { name, teamId } });
	},

	snooze: async ({ request, locals }) => {
		const session = await locals.auth();
		const userId = session!.user!.id!;
		const data = await request.formData();
		const taskId = data.get('taskId') as string;
		const preset = data.get('preset') as string | null;
		const customDate = data.get('customDate') as string | null;

		let snoozedUntil: Date;

		if (preset === 'tomorrow') {
			snoozedUntil = at9amPT(1);
		} else if (preset === '3days') {
			snoozedUntil = at9amPT(3);
		} else if (preset === '1week') {
			snoozedUntil = at9amPT(7);
		} else if (customDate) {
			const [year, month, day] = customDate.split('-').map(Number);
			snoozedUntil = fromZonedTime(new Date(year, month - 1, day, 9, 0, 0), TZ);
			if (isNaN(snoozedUntil.getTime())) return fail(400, { error: 'Invalid date' });
		} else {
			return fail(400, { error: 'No snooze time provided' });
		}

		const task = await prisma.task.findUnique({ where: { id: taskId }, select: { assignedTo: true } });
		if (!task || task.assignedTo !== userId) return fail(403, { error: 'Forbidden' });

		await prisma.task.update({ where: { id: taskId }, data: { snoozedUntil } });
	},

	unsnooze: async ({ request, locals }) => {
		const session = await locals.auth();
		const userId = session!.user!.id!;
		const data = await request.formData();
		const taskId = data.get('taskId') as string;

		const task = await prisma.task.findUnique({ where: { id: taskId }, select: { assignedTo: true } });
		if (!task || task.assignedTo !== userId) return fail(403, { error: 'Forbidden' });

		await prisma.task.update({ where: { id: taskId }, data: { snoozedUntil: null } });
	},

	updateStatus: async ({ request, locals }) => {
		const session = await locals.auth();
		const userId = session!.user!.id!;
		const data = await request.formData();
		const taskId = data.get('taskId') as string;
		const status = data.get('status') as 'todo' | 'in_progress' | 'done';

		const task = await prisma.task.findUnique({
			where: { id: taskId },
			select: { assignedTo: true }
		});
		if (!task || task.assignedTo !== userId) return fail(403, { error: 'Forbidden' });

		await prisma.task.update({
			where: { id: taskId },
			data: {
				status,
				completedAt: status === 'done' ? new Date() : null
			}
		});
	}
};
