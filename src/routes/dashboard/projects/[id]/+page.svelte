<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
	let { project } = $derived(data);
	let members = $derived(project.team.members);
	let open = $state(false);
</script>

<main style="padding: 2rem; max-width: 640px">
	<a href="/dashboard">← Dashboard</a>
	<h1>{project.name}</h1>

	<ul style="padding: 0; list-style: none">
		{#each project.tasks as task}
			<li style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0; border-bottom: 1px solid #eee">
				<form method="POST" action="?/completeTask" use:enhance>
					<input type="hidden" name="taskId" value={task.id} />
					<button type="submit" style="cursor: pointer">
						{task.completedAt ? '☑' : '☐'}
					</button>
				</form>
				<span style={task.completedAt ? 'text-decoration: line-through; color: #999' : ''}>
					{task.title}
				</span>
				<span style="margin-left: auto; font-size: 0.85rem; color: #666">
					{task.assignee.name ?? task.assignee.email}
				</span>
				<form method="POST" action="?/deleteTask" use:enhance>
					<input type="hidden" name="taskId" value={task.id} />
					<button type="submit" style="color: #c00; cursor: pointer">✕</button>
				</form>
			</li>
		{/each}
	</ul>

	{#if open}
		<form method="POST" action="?/createTask" use:enhance={() => async ({ update }) => { open = false; await update(); }} style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem">
			<input name="title" placeholder="Task title" required autofocus />
			<select name="assignedTo" required>
				<option value="">Assign to…</option>
				{#each members as m}
					<option value={m.userId}>{m.user.name ?? m.user.email}</option>
				{/each}
			</select>
			<div style="display: flex; gap: 0.5rem">
				<button type="submit">Add task</button>
				<button type="button" onclick={() => (open = false)}>Cancel</button>
			</div>
		</form>
	{:else}
		<button onclick={() => (open = true)} style="margin-top: 1rem">+ New task</button>
	{/if}
</main>
