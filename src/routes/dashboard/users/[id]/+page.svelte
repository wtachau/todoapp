<script lang="ts">
	let { data } = $props();
	const name = $derived(data.partner.name ?? data.partner.email);
</script>

<main class="p-8 max-w-2xl mx-auto">
	<p class="mb-4"><a href="/dashboard" class="text-blue-600 hover:underline">← Back</a></p>

	<h1 class="text-2xl font-bold mb-6">{name}'s Tasks</h1>

	{#if data.tasks.length === 0}
		<p class="text-gray-400">No tasks.</p>
	{:else}
		<ul class="list-none p-0 mb-8">
			{#each data.tasks as task}
				<li class="flex items-center gap-3 py-2 border-b border-gray-100">
					<span class="text-sm text-gray-500 w-24 shrink-0">
						{task.status === 'todo' ? 'To do' : task.status === 'in_progress' ? 'In progress' : 'Done'}
					</span>
					<span class={task.status === 'done' ? 'line-through text-gray-400' : ''}>
						{task.title}
					</span>
					<span class="ml-auto text-xs text-gray-400 shrink-0">
						{task.project.team.name} / {task.project.name}
					</span>
				</li>
			{/each}
		</ul>
	{/if}

	<a href="?showDone={!data.showDone}" class="text-sm text-blue-600 hover:underline">
		{data.showDone ? 'Hide completed' : 'Show completed'}
	</a>
</main>
