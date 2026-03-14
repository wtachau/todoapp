import { prisma } from '$lib/server/prisma';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const session = await locals.auth();
	const userId = session!.user!.id!;

	const project = await prisma.project.findUnique({
		where: { id: params.id },
		include: {
			tasks: {
				orderBy: { createdAt: 'desc' },
				include: { assignee: true }
			},
			team: {
				include: { members: { include: { user: true } } }
			}
		}
	});

	if (!project) throw error(404, 'Project not found');

	const isMember = project.team.members.some((m) => m.userId === userId);
	if (!isMember) throw error(403, 'Forbidden');

	return { project };
};

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
			include: { team: { include: { members: true } } }
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
			include: { project: { include: { team: { include: { members: true } } } } }
		});
		if (!task) throw error(404);

		const isMember = task.project.team.members.some((m) => m.userId === userId);
		if (!isMember) return fail(403, { error: 'Forbidden' });

		await prisma.task.update({
			where: { id: taskId },
			data: { completedAt: task.completedAt ? null : new Date() }
		});
	},

	deleteTask: async ({ request, locals }) => {
		const session = await locals.auth();
		const userId = session!.user!.id!;
		const data = await request.formData();
		const taskId = data.get('taskId') as string;

		const task = await prisma.task.findUnique({
			where: { id: taskId },
			include: { project: { include: { team: { include: { members: true } } } } }
		});
		if (!task) throw error(404);

		const isMember = task.project.team.members.some((m) => m.userId === userId);
		if (!isMember) return fail(403, { error: 'Forbidden' });

		await prisma.task.delete({ where: { id: taskId } });
	}
};
