export async function getUserId(locals: App.Locals): Promise<string> {
	const session = await locals.auth();
	return session!.user!.id!;
}
