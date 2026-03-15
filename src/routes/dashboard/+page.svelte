<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
	let creatingFor = $state<string | null>(null);

	const statusLabel: Record<string, string> = {
		todo: 'To do',
		in_progress: 'In progress',
		done: 'Done'
	};
</script>

<main style="padding: 2rem; max-width: 640px">
	<h1>My Tasks</h1>

	{#if data.partners.length > 0}
		<p style="margin-bottom: 1rem">
			{#each data.partners as partner}
				<a href="/dashboard/users/{partner.id}">{partner.name ?? partner.email}'s tasks</a>
				{' '}
			{/each}
		</p>
	{/if}

	{#if data.tasks.length === 0}
		<p style="color: #888">No tasks.</p>
	{:else}
		<ul style="list-style: none; padding: 0; margin-bottom: 2rem">
			{#each data.tasks as task}
				<li style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0; border-bottom: 1px solid #eee">
					<form method="POST" action="?/updateStatus" use:enhance style="display: contents">
						<input type="hidden" name="taskId" value={task.id} />
						<select
							name="status"
							value={task.status}
							onchange={(e) => e.currentTarget.form?.requestSubmit()}
							style="font-size: 0.8rem"
						>
							<option value="todo">To do</option>
							<option value="in_progress">In progress</option>
							<option value="done">Done</option>
						</select>
					</form>
					<span style={task.status === 'done' ? 'text-decoration: line-through; color: #888' : ''}>
						{task.title}
					</span>
					<span style="margin-left: auto; font-size: 0.75rem; color: #888">
						{task.project.team.name} / {task.project.name}
					</span>
				</li>
			{/each}
		</ul>
	{/if}

	<a href="?showDone={!data.showDone}" style="font-size: 0.85rem">
		{data.showDone ? 'Hide completed' : 'Show completed'}
	</a>

	<hr style="margin: 2rem 0" />

	<h2>Projects</h2>

	{#each data.teams as team}
		<section style="margin-bottom: 2rem">
			<h3>{team.name}</h3>

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
