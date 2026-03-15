<script lang="ts">
	let { data } = $props();
	const name = $derived(data.partner.name ?? data.partner.email);
</script>

<main style="padding: 2rem; max-width: 640px">
	<p><a href="/dashboard">← Back</a></p>

	<h1>{name}'s Tasks</h1>

	{#if data.tasks.length === 0}
		<p style="color: #888">No tasks.</p>
	{:else}
		<ul style="list-style: none; padding: 0; margin-bottom: 2rem">
			{#each data.tasks as task}
				<li style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0; border-bottom: 1px solid #eee">
					<span style="font-size: 0.8rem; color: #555; min-width: 80px">
						{task.status === 'todo' ? 'To do' : task.status === 'in_progress' ? 'In progress' : 'Done'}
					</span>
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
</main>
