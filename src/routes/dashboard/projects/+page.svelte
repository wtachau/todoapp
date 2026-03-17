<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
	let creatingFor = $state<string | null>(null);
</script>

<svelte:head>
	<title>Tasks | Projects</title>
</svelte:head>

<h1 class="text-xl font-semibold text-ink mt-2 mb-6">Projects</h1>

{#each data.teams as team}
	<div class="mb-8">
		<div class="text-xs font-bold tracking-wide text-stone uppercase mb-2">{team.name}</div>

		{#each team.projects as project}
			<a href="/dashboard/projects/{project.id}" class="block text-sm text-sage hover:underline py-1">
				{project.name}
			</a>
		{/each}

		{#if creatingFor === team.id}
			<form method="POST" action="?/createProject" use:enhance class="flex gap-2 mt-2">
				<input type="hidden" name="teamId" value={team.id} />
				<input
					name="name"
					placeholder="Project name"
					required
					autofocus
					class="flex-1 border border-stone-light rounded px-3 py-1.5 text-sm bg-white focus:border-sage focus:outline-none"
				/>
				<button type="submit" class="px-3 py-1.5 bg-sage text-white text-sm rounded hover:bg-sage/90 cursor-pointer">Add</button>
				<button type="button" onclick={() => (creatingFor = null)} class="px-3 py-1.5 text-sm text-stone hover:text-ink cursor-pointer">Cancel</button>
			</form>
		{:else}
			<button onclick={() => (creatingFor = team.id)} class="mt-1 text-xs text-stone hover:text-sage transition-colors cursor-pointer">
				+ New project
			</button>
		{/if}
	</div>
{/each}
