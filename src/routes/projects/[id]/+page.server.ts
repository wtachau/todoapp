import { prisma } from '$lib/server/prisma';
import { getUserId } from '$lib/server/auth';
import { projectWithMembers, taskWithProjectMembers } from '$lib/server/queries';
import { error, fail } from '@sveltejs/kit';
import pkg from 'rrule';
const { RRule } = pkg;

function startOfDayUTC(date: Date): Date {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const userId = await getUserId(locals);

	const project = await prisma.project.findUnique({
		where: { id: params.id },
		include: {
			tasks: {
				orderBy: { createdAt: 'desc' },
				include: { assignee: true }
			},
			generators: {
				orderBy: { createdAt: 'desc' },
				include: { fixedAssignee: true }
			},
			team: {
				include: { members: { include: { user: true } } }
			}
		}
	});

	if (!project) throw error(404, 'Project not found');

	const isMember = project.team.members.some((m) => m.userId === userId);
	if (!isMember) throw error(403, 'Forbidden');

	const members = project.team.members.map((m) => m.user);
	const generators = project.generators.map((g) => {
		const rruleText = (() => {
			try { return RRule.fromString(g.recurrenceRule.replace('RRULE:', '')).toText(); }
			catch { return g.recurrenceRule.replace('RRULE:', ''); }
		})();
		let nextAssigneeName: string | null = null;
		const firstName = (name: string | null | undefined, email: string | null | undefined) =>
			(name ?? email ?? '').split(' ')[0] || null;
		if (g.assignmentMode === 'fixed') {
			nextAssigneeName = firstName(g.fixedAssignee?.name, g.fixedAssignee?.email);
		} else {
			const next = members.find((m) => m.id !== g.lastAssignedTo) ?? members[0];
			nextAssigneeName = firstName(next?.name, next?.email);
		}
		return { ...g, rruleText, nextAssigneeName };
	});

	return { project: { ...project, generators } };
};

const DAY_MAP: Record<string, number> = {
	MO: RRule.MO.weekday,
	TU: RRule.TU.weekday,
	WE: RRule.WE.weekday,
	TH: RRule.TH.weekday,
	FR: RRule.FR.weekday,
	SA: RRule.SA.weekday,
	SU: RRule.SU.weekday
};

function buildNextRunAt(recurrenceRule: string): Date {
	const rule = RRule.fromString(recurrenceRule);
	return rule.after(new Date()) ?? new Date();
}

export const actions: Actions = {
	createTask: async ({ request, params, locals }) => {
		const session = await locals.auth();
		const userId = session!.user!.id!;
		const data = await request.formData();
		const title = (data.get('title') as string)?.trim();
		const assignedTo = data.get('assignedTo') as string;

		if (!title) return fail(400, { error: 'Title is required' });

		const project = await prisma.project.findUnique({
			where: { id: params.id },
			include: projectWithMembers
		});
		if (!project) throw error(404);

		const isMember = project.team.members.some((m) => m.userId === userId);
		if (!isMember) return fail(403, { error: 'Forbidden' });

		const isValidAssignee = project.team.members.some((m) => m.userId === assignedTo);
		if (!isValidAssignee) return fail(400, { error: 'Invalid assignee' });

		await prisma.task.create({ data: { title, projectId: params.id, assignedTo } });
	},

	completeTask: async ({ request, locals }) => {
		const session = await locals.auth();
		const userId = session!.user!.id!;
		const data = await request.formData();
		const taskId = data.get('taskId') as string;

		const task = await prisma.task.findUnique({
			where: { id: taskId },
			include: taskWithProjectMembers
		});
		if (!task) throw error(404);

		const isMember = task.project.team.members.some((m) => m.userId === userId);
		if (!isMember) return fail(403, { error: 'Forbidden' });

		const done = task.completedAt === null;
		await prisma.task.update({
			where: { id: taskId },
			data: {
				status: done ? 'done' : 'todo',
				completedAt: done ? new Date() : null
			}
		});
	},

	deleteTask: async ({ request, locals }) => {
		const session = await locals.auth();
		const userId = session!.user!.id!;
		const data = await request.formData();
		const taskId = data.get('taskId') as string;

		const task = await prisma.task.findUnique({
			where: { id: taskId },
			include: taskWithProjectMembers
		});
		if (!task) throw error(404);

		const isMember = task.project.team.members.some((m) => m.userId === userId);
		if (!isMember) return fail(403, { error: 'Forbidden' });

		await prisma.task.delete({ where: { id: taskId } });
	},

	createGenerator: async ({ request, params, locals }) => {
		const session = await locals.auth();
		const userId = session!.user!.id!;
		const data = await request.formData();

		const title = (data.get('title') as string)?.trim();
		const assignmentMode = data.get('assignmentMode') as string;
		const fixedAssigneeId = (data.get('fixedAssigneeId') as string) || null;
		const startsWithId = (data.get('startsWithId') as string) || null;
		const advanced = data.get('advanced') === 'true';
		const days = data.getAll('days') as string[];
		const rruleRaw = (data.get('rrule') as string)?.trim();

		if (!title) return fail(400, { error: 'Title is required' });
		if (!['fixed', 'round_robin'].includes(assignmentMode))
			return fail(400, { error: 'Invalid assignment mode' });
		if (assignmentMode === 'fixed' && !fixedAssigneeId)
			return fail(400, { error: 'Assignee required for fixed mode' });
		if (!advanced && days.length === 0) return fail(400, { error: 'Select at least one day' });
		if (advanced && !rruleRaw) return fail(400, { error: 'RRULE is required' });

		const project = await prisma.project.findUnique({
			where: { id: params.id },
			include: projectWithMembers
		});
		if (!project) throw error(404);

		const isMember = project.team.members.some((m) => m.userId === userId);
		if (!isMember) return fail(403, { error: 'Forbidden' });

		if (fixedAssigneeId) {
			const isValidAssignee = project.team.members.some((m) => m.userId === fixedAssigneeId);
			if (!isValidAssignee) return fail(400, { error: 'Invalid assignee' });
		}

		let recurrenceRule: string;
		let nextRunAt: Date;
		if (advanced) {
			try {
				const rule = RRule.fromString(rruleRaw);
				recurrenceRule = rule.toString();
				nextRunAt = startOfDayUTC(rule.after(new Date()) ?? new Date());
			} catch {
				return fail(400, { error: 'Invalid RRULE string' });
			}
		} else {
			const byweekday = days.map((d) => DAY_MAP[d]);
			const rule = new RRule({ freq: RRule.WEEKLY, byweekday });
			recurrenceRule = rule.toString();
			nextRunAt = startOfDayUTC(rule.after(new Date()) ?? new Date());
		}

		// For round-robin: if a start person is specified, set lastAssignedTo to the
		// *other* member so the first generated task goes to the chosen person.
		let initialLastAssignedTo: string | null = null;
		if (assignmentMode === 'round_robin' && startsWithId) {
			const other = project.team.members.find((m) => m.userId !== startsWithId);
			initialLastAssignedTo = other?.userId ?? null;
		}

		await prisma.taskGenerator.create({
			data: {
				title,
				projectId: params.id,
				assignmentMode: assignmentMode as 'fixed' | 'round_robin',
				fixedAssigneeId,
				lastAssignedTo: initialLastAssignedTo,
				recurrenceRule,
				nextRunAt
			}
		});
	},

	updateGenerator: async ({ request, locals }) => {
		const userId = await getUserId(locals);
		const data = await request.formData();
		const generatorId = data.get('generatorId') as string;
		const title = (data.get('title') as string)?.trim();
		const assignmentMode = data.get('assignmentMode') as string;
		const fixedAssigneeId = (data.get('fixedAssigneeId') as string) || null;
		const startsWithId = (data.get('startsWithId') as string) || null;
		const advanced = data.get('advanced') === 'true';
		const days = data.getAll('days') as string[];
		const rruleRaw = (data.get('rrule') as string)?.trim();

		if (!title) return fail(400, { error: 'Title is required' });
		if (!['fixed', 'round_robin'].includes(assignmentMode))
			return fail(400, { error: 'Invalid assignment mode' });
		if (assignmentMode === 'fixed' && !fixedAssigneeId)
			return fail(400, { error: 'Assignee required for fixed mode' });
		if (!advanced && days.length === 0) return fail(400, { error: 'Select at least one day' });
		if (advanced && !rruleRaw) return fail(400, { error: 'RRULE is required' });

		const generator = await prisma.taskGenerator.findUnique({
			where: { id: generatorId },
			include: taskWithProjectMembers
		});
		if (!generator) throw error(404);

		const isMember = generator.project.team.members.some((m) => m.userId === userId);
		if (!isMember) return fail(403, { error: 'Forbidden' });

		let recurrenceRule: string;
		let nextRunAt: Date;
		if (advanced) {
			try {
				const rule = RRule.fromString(rruleRaw);
				recurrenceRule = rule.toString();
				nextRunAt = startOfDayUTC(rule.after(new Date()) ?? new Date());
			} catch {
				return fail(400, { error: 'Invalid RRULE string' });
			}
		} else {
			const byweekday = days.map((d) => DAY_MAP[d]);
			const rule = new RRule({ freq: RRule.WEEKLY, byweekday });
			recurrenceRule = rule.toString();
			nextRunAt = startOfDayUTC(rule.after(new Date()) ?? new Date());
		}

		let lastAssignedTo = generator.lastAssignedTo;
		if (assignmentMode === 'round_robin' && startsWithId) {
			const other = generator.project.team.members.find((m) => m.userId !== startsWithId);
			lastAssignedTo = other?.userId ?? null;
		}
		if (assignmentMode === 'fixed') lastAssignedTo = null;

		await prisma.taskGenerator.update({
			where: { id: generatorId },
			data: {
				title,
				assignmentMode: assignmentMode as 'fixed' | 'round_robin',
				fixedAssigneeId,
				lastAssignedTo,
				recurrenceRule,
				nextRunAt
			}
		});
	},

	deleteGenerator: async ({ request, locals }) => {
		const session = await locals.auth();
		const userId = session!.user!.id!;
		const data = await request.formData();
		const generatorId = data.get('generatorId') as string;

		const generator = await prisma.taskGenerator.findUnique({
			where: { id: generatorId },
			include: taskWithProjectMembers
		});
		if (!generator) throw error(404);

		const isMember = generator.project.team.members.some((m) => m.userId === userId);
		if (!isMember) return fail(403, { error: 'Forbidden' });

		await prisma.taskGenerator.delete({ where: { id: generatorId } });
	}
};
