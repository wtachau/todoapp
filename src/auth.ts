import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/sveltekit/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '$lib/server/prisma';
import { AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET } from '$env/static/private';

export const { handle, signIn, signOut } = SvelteKitAuth({
	adapter: PrismaAdapter(prisma),
	providers: [Google({ clientId: AUTH_GOOGLE_ID, clientSecret: AUTH_GOOGLE_SECRET })],
	secret: AUTH_SECRET,
	trustHost: true,
	callbacks: {
		session({ session, user }) {
			session.user.id = user.id;
			return session;
		}
	},
	events: {
		async createUser({ user }) {
			if (!user.id) return;
			const team = await prisma.team.create({ data: { name: 'Personal' } });
			await prisma.teamMember.create({ data: { teamId: team.id, userId: user.id } });
			const project = await prisma.project.create({ data: { name: 'Personal', teamId: team.id } });
			await prisma.user.update({ where: { id: user.id }, data: { defaultProjectId: project.id } });
		}
	}
});
