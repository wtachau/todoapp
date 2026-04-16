import { RRule } from 'rrule';
import { fail } from '@sveltejs/kit';
import { prisma } from './prisma';
import { projectWithMembers } from './queries';
import { DEFAULT_TIMEZONE, startOfDayInTimezone } from './timezone';

export const DAY_MAP: Record<string, number> = {
	MO: RRule.MO.weekday,
	TU: RRule.TU.weekday,
	WE: RRule.WE.weekday,
	TH: RRule.TH.weekday,
	FR: RRule.FR.weekday,
	SA: RRule.SA.weekday,
	SU: RRule.SU.weekday
};

// Shared by the dashboard (projectId comes from form) and the project page (projectId from params).
// Returns either { ok: true } on success or a kit fail result on validation error.
export async function createGeneratorFromFormData(
	form: FormData,
	projectId: string,
	userId: string
) {
	const title = (form.get('title') as string)?.trim();
	const assignmentMode = form.get('assignmentMode') as string;
	const fixedAssigneeId = (form.get('fixedAssigneeId') as string) || null;
	const startsWithId = (form.get('startsWithId') as string) || null;
	const advanced = form.get('advanced') === 'true';
	const days = form.getAll('days') as string[];
	const rruleRaw = (form.get('rrule') as string)?.trim();

	if (!title) return fail(400, { error: 'Title is required' });
	if (!['fixed', 'round_robin'].includes(assignmentMode))
		return fail(400, { error: 'Invalid assignment mode' });
	if (assignmentMode === 'fixed' && !fixedAssigneeId)
		return fail(400, { error: 'Assignee required for fixed mode' });
	if (!advanced && days.length === 0) return fail(400, { error: 'Select at least one day' });
	if (advanced && !rruleRaw) return fail(400, { error: 'RRULE is required' });

	const project = await prisma.project.findUnique({
		where: { id: projectId },
		include: projectWithMembers
	});
	if (!project) return fail(404, { error: 'Project not found' });
	if (!project.team.members.some((m) => m.userId === userId))
		return fail(403, { error: 'Forbidden' });

	if (fixedAssigneeId && !project.team.members.some((m) => m.userId === fixedAssigneeId))
		return fail(400, { error: 'Invalid assignee' });

	let recurrenceRule: string;
	let nextRunAt: Date;
	if (advanced) {
		try {
			const rule = RRule.fromString(rruleRaw);
			recurrenceRule = rule.toString();
			nextRunAt = startOfDayInTimezone(rule.after(new Date()) ?? new Date(), DEFAULT_TIMEZONE);
		} catch {
			return fail(400, { error: 'Invalid RRULE string' });
		}
	} else {
		const byweekday = days.map((d) => DAY_MAP[d]);
		const rule = new RRule({ freq: RRule.WEEKLY, byweekday });
		recurrenceRule = rule.toString();
		nextRunAt = startOfDayInTimezone(rule.after(new Date()) ?? new Date(), DEFAULT_TIMEZONE);
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
			projectId,
			assignmentMode: assignmentMode as 'fixed' | 'round_robin',
			fixedAssigneeId,
			lastAssignedTo: initialLastAssignedTo,
			recurrenceRule,
			nextRunAt
		}
	});

	return { ok: true as const };
}
