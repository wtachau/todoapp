import { prisma } from '$lib/server/prisma';
import { getUserId } from '$lib/server/auth';
import { error, fail } from '@sveltejs/kit';
import { fromZonedTime } from 'date-fns-tz';
import type { Actions, PageServerLoad } from './$types';

const TZ = 'America/Los_Angeles';

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

	const [partner, me, tasks, sharedProjects] = await Promise.all([
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
		}),
		prisma.project.findMany({
			where: { teamId: { in: sharedTeamIds } },
			orderBy: { name: 'asc' }
		})
	]);

	if (!partner) error(404, 'User not found');

	return { partner, tasks, sharedProjects, showDone, urgencyDays: me?.urgencyDays ?? 7 };
};

export const actions: Actions = {
	createTask: async ({ request, locals, params }) => {
		const myUserId = await getUserId(locals);
		const partnerId = params.id;
		const data = await request.formData();
		const title = (data.get('title') as string)?.trim();
		const projectId = data.get('projectId') as string;

		if (!title) return fail(400, { error: 'Title is required' });

		// Verify shared team membership for the project
		const project = await prisma.project.findUnique({
			where: { id: projectId },
			include: { team: { include: { members: true } } }
		});
		if (!project) return fail(404, { error: 'Project not found' });
		const members = project.team.members.map((m) => m.userId);
		if (!members.includes(myUserId) || !members.includes(partnerId))
			return fail(403, { error: 'Forbidden' });

		const scheduledFor = data.get('scheduledFor') as string | null;
		let snoozedUntil: Date | null = null;
		if (scheduledFor) {
			const [year, month, day] = scheduledFor.split('-').map(Number);
			snoozedUntil = fromZonedTime(new Date(year, month - 1, day, 9, 0, 0), TZ);
		}

		await prisma.task.create({ data: { title, projectId, assignedTo: partnerId, snoozedUntil } });
	}
};
