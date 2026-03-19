// Reusable Prisma include shapes

export const projectWithMembers = {
	team: { include: { members: true } }
} as const;

export const projectWithMemberUsers = {
	team: { include: { members: { include: { user: true } } } }
} as const;

export const taskWithProjectMembers = {
	project: { include: { team: { include: { members: true } } } }
} as const;
