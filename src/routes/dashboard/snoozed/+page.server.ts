import { prisma } from '$lib/server/prisma';
import { getUserId } from '$lib/server/auth';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = await getUserId(locals);

	const tasks = await prisma.task.findMany({
		where: {
			assignedTo: userId,
			snoozedUntil: { gt: new Date() }
		},
		include: {
			project: { include: { team: true } }
		},
		orderBy: { snoozedUntil: 'asc' }
	});

	return { tasks };
};

export const actions: Actions = {
	unsnooze: async ({ request, locals }) => {
		const session = await locals.auth();
		const userId = session!.user!.id!;
		const data = await request.formData();
		const taskId = data.get('taskId') as string;

		const task = await prisma.task.findUnique({ where: { id: taskId }, select: { assignedTo: true } });
		if (!task || task.assignedTo !== userId) return fail(403, { error: 'Forbidden' });

		await prisma.task.update({ where: { id: taskId }, data: { snoozedUntil: null } });
	}
};
