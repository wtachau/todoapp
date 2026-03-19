import { prisma } from '$lib/server/prisma';
import { getUserId } from '$lib/server/auth';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = await getUserId(locals);
	const user = await prisma.user.findUnique({ where: { id: userId }, select: { urgencyDays: true } });
	return { urgencyDays: user?.urgencyDays ?? 3 };
};

export const actions: Actions = {
	updateUrgency: async ({ request, locals }) => {
		const session = await locals.auth();
		const userId = session!.user!.id!;
		const data = await request.formData();
		const raw = data.get('urgencyDays');
		const urgencyDays = parseInt(raw as string, 10);
		if (isNaN(urgencyDays) || urgencyDays < 1 || urgencyDays > 365) {
			return fail(400, { error: 'Must be between 1 and 365' });
		}
		await prisma.user.update({ where: { id: userId }, data: { urgencyDays } });
		return { success: true };
	}
};
