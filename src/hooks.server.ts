import { handle as authHandle } from './auth';
import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';

const PROTECTED_ROUTES = ['/dashboard'];

const authGuard: Handle = async ({ event, resolve }) => {
	const session = await event.locals.auth();

	const isProtected = PROTECTED_ROUTES.some((route) =>
		event.url.pathname.startsWith(route)
	);

	if (isProtected && !session?.user) {
		throw redirect(307, '/sign-in');
	}

	return resolve(event);
};

export const handle = sequence(authHandle, authGuard);
