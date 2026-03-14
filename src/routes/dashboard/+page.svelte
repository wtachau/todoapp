<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
	let creatingFor = $state<string | null>(null);
</script>

<main style="padding: 2rem; max-width: 640px">
	<h1>Dashboard</h1>

	{#each data.teams as team}
		<section style="margin-bottom: 2rem">
			<h2>{team.name}</h2>

			{#each team.projects as project}
				<div>
					<a href="/dashboard/projects/{project.id}">{project.name}</a>
				</div>
			{/each}

			{#if creatingFor === team.id}
				<form method="POST" action="?/createProject" use:enhance style="margin-top: 0.5rem">
					<input type="hidden" name="teamId" value={team.id} />
					<input name="name" placeholder="Project name" required autofocus />
					<button type="submit">Add</button>
					<button type="button" onclick={() => (creatingFor = null)}>Cancel</button>
				</form>
			{:else}
				<button onclick={() => (creatingFor = team.id)} style="margin-top: 0.5rem">
					+ New project
				</button>
			{/if}
		</section>
	{/each}
</main>
