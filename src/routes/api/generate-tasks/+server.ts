import { prisma } from '$lib/server/prisma';
import { error } from '@sveltejs/kit';
import pkg from 'rrule';
import type { RequestHandler } from './$types';

const { RRule } = pkg;

function startOfDayUTC(date: Date): Date {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export const GET: RequestHandler = async ({ request }) => {
	if (process.env.NODE_ENV !== 'development') {
		const expected = process.env.CRON_SECRET;
		const auth = request.headers.get('authorization');
		if (!expected || auth !== `Bearer ${expected}`) {
			throw error(401, 'Unauthorized');
		}
	}

	const now = new Date();
	const generators = await prisma.taskGenerator.findMany({
		select: { id: true, title: true, nextRunAt: true, recurrenceRule: true, assignmentMode: true }
	});

	return new Response(
		JSON.stringify({ now, generators }, null, 2),
		{ headers: { 'content-type': 'application/json' } }
	);
};

export const POST: RequestHandler = async ({ request }) => {
	// Auth: skip in dev, require CRON_SECRET in prod
	if (process.env.NODE_ENV !== 'development') {
		const expected = process.env.CRON_SECRET;
		const auth = request.headers.get('authorization');
		if (!expected || auth !== `Bearer ${expected}`) {
			throw error(401, 'Unauthorized');
		}
	}

	const now = new Date();

	const generators = await prisma.taskGenerator.findMany({
		where: { nextRunAt: { lte: now } },
		include: {
			project: {
				include: { team: { include: { members: true } } }
			}
		}
	});

	let created = 0;

	for (const gen of generators) {
		const members = gen.project.team.members;

		// Determine assignee
		let assignedTo: string | null = null;
		if (gen.assignmentMode === 'fixed') {
			assignedTo = gen.fixedAssigneeId;
		} else {
			// Round-robin: pick the member who is NOT lastAssignedTo
			const next = members.find((m) => m.userId !== gen.lastAssignedTo);
			assignedTo = next?.userId ?? members[0]?.userId ?? null;
		}

		if (!assignedTo) continue;

		// Advance nextRunAt before creating the task so we have the correct createdAt
		const taskCreatedAt = gen.nextRunAt;
		const rule = RRule.fromString(gen.recurrenceRule);
		// Advance from start of the day AFTER nextRunAt to avoid re-triggering the same day
		// when DTSTART has a time component later than midnight.
		const dayAfter = new Date(Date.UTC(
			gen.nextRunAt.getUTCFullYear(),
			gen.nextRunAt.getUTCMonth(),
			gen.nextRunAt.getUTCDate() + 1
		));
		const nextRunAt = startOfDayUTC(rule.after(dayAfter, true) ?? dayAfter);

		// Two separate inserts — no nested create (dbgenerated UUID convention)
		const task = await prisma.task.create({
			data: {
				title: gen.title,
				projectId: gen.projectId,
				assignedTo,
				createdAt: taskCreatedAt
			}
		});

		await prisma.task.update({
			where: { id: task.id },
			data: { generatorId: gen.id }
		});

		await prisma.taskGenerator.update({
			where: { id: gen.id },
			data: {
				nextRunAt,
				lastAssignedTo: gen.assignmentMode === 'round_robin' ? assignedTo : gen.lastAssignedTo
			}
		});

		created++;
	}

	return new Response(JSON.stringify({ created }), {
		headers: { 'content-type': 'application/json' }
	});
};
