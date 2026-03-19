import { prisma } from '$lib/server/prisma';
import { getUserId } from '$lib/server/auth';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const myUserId = await getUserId(locals);
	const partnerId = params.id;
	const showDone = url.searchParams.get('showDone') === 'true';

	// Verify we share at least one team with this person
	const sharedTeams = await prisma.team.findMany({
		where: {
			members: { some: { userId: myUserId } },
			AND: { members: { some: { userId: partnerId } } }
		},
		select: { id: true }
	});

	if (sharedTeams.length === 0) error(403, 'Forbidden');

	const sharedTeamIds = sharedTeams.map((t) => t.id);

	const [partner, me, tasks] = await Promise.all([
		prisma.user.findUnique({ where: { id: partnerId }, select: { name: true, email: true } }),
		prisma.user.findUnique({ where: { id: myUserId }, select: { urgencyDays: true } }),
		prisma.task.findMany({
			where: {
				assignedTo: partnerId,
				project: { teamId: { in: sharedTeamIds } },
				...(showDone ? {} : { status: { not: 'done' } })
			},
			include: {
				project: { include: { team: true } }
			},
			orderBy: { createdAt: 'desc' }
		})
	]);

	if (!partner) error(404, 'User not found');

	return { partner, tasks, showDone, urgencyDays: me?.urgencyDays ?? 7 };
};
