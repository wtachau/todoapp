import { prisma } from '$lib/server/prisma';
import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const session = await locals.auth();
	const userId = session!.user!.id!;
	const showDone = url.searchParams.get('showDone') === 'true';

	const [tasks, teams] = await Promise.all([
		prisma.task.findMany({
			where: {
				assignedTo: userId,
				...(showDone ? {} : { status: { not: 'done' } })
			},
			include: {
				project: { include: { team: true } }
			},
			orderBy: { createdAt: 'desc' }
		}),
		prisma.team.findMany({
			where: { members: { some: { userId } } },
			include: {
				projects: { orderBy: { createdAt: 'desc' } },
				members: { include: { user: true } }
			}
		})
	]);

	// Shared team members (excluding self) for partner links
	const partners = teams
		.filter((t) => t.members.length > 1)
		.flatMap((t) => t.members.filter((m) => m.userId !== userId).map((m) => m.user))
		.filter((u, i, arr) => arr.findIndex((x) => x.id === u.id) === i); // dedupe

	return { tasks, teams, partners, showDone };
};

export const actions: Actions = {
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

		const project = await prisma.project.create({ data: { name, teamId } });
		redirect(303, `/dashboard/projects/${project.id}`);
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
