import type { Session } from '@auth/sveltekit';

declare global {
	namespace App {
		interface Locals {
			auth: () => Promise<Session | null>;
		}
		// interface Error {}
		// interface PageData {}
		// interface Platform {}
	}
}

export {};
