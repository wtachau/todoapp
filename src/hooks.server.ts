import { handle as authHandle } from './auth';
import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';

const PUBLIC_ROUTES = ['/sign-in', '/api'];

const authGuard: Handle = async ({ event, resolve }) => {
	const isPublic = PUBLIC_ROUTES.some((route) => event.url.pathname.startsWith(route));

	if (!isPublic) {
		const session = await event.locals.auth();
		if (!session?.user) throw redirect(307, '/sign-in');
	}

	return resolve(event);
};

export const handle = sequence(authHandle, authGuard);
