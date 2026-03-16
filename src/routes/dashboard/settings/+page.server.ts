import { prisma } from '$lib/server/prisma';
import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth();
	const userId = session!.user!.id!;

	const teams = await prisma.team.findMany({
		where: { members: { some: { userId } } },
		include: {
			projects: { orderBy: { createdAt: 'asc' } },
			members: { include: { user: true } }
		},
		orderBy: { createdAt: 'asc' }
	});

	return { teams };
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
	}
};
