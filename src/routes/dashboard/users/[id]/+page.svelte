<script lang="ts">
	let { data } = $props();
	const name = $derived(data.partner.name ?? data.partner.email);
</script>

<svelte:head>
	<title>Tasks | {name}'s tasks</title>
</svelte:head>

<div class="flex items-baseline gap-3 mt-2 mb-6">
	<a href="/dashboard" class="text-xs text-stone hover:text-sage transition-colors">← back</a>
	<h2 class="text-[10px] font-bold tracking-[0.14em] uppercase text-stone-muted">{name}'s tasks · shared projects</h2>
</div>

{#if data.tasks.length === 0}
	<p class="text-stone text-sm py-4">No tasks.</p>
{:else}
	<div class="flex flex-col gap-1.5 mb-6">
		{#each data.tasks as task}
			<div class="bg-card border border-stone-light rounded-md px-3.5 py-2.5 flex items-center gap-3 hover:border-stone transition-colors"
				class:opacity-50={task.status === 'done'}>
				<div class="w-2.5 h-2.5 rounded-full bg-sage-muted shrink-0"></div>
				<div class="flex-1">
					<div class="text-sm" class:line-through={task.status === 'done'} class:text-stone={task.status === 'done'}>
						{task.title}
					</div>
					<div class="flex gap-1 mt-1 flex-wrap">
						<span class="text-[10px] font-bold tracking-[0.07em] uppercase px-2 py-0.5 rounded-full bg-stone-lighter text-stone">{task.project.name}</span>
					</div>
				</div>
				<span class="text-xs text-stone shrink-0">
					{task.status === 'todo' ? 'to do' : task.status === 'in_progress' ? 'in progress' : 'done'}
				</span>
			</div>
		{/each}
	</div>
{/if}

<a href="?showDone={!data.showDone}" class="text-xs text-stone hover:text-sage transition-colors">
	{data.showDone ? 'hide completed ↑' : 'show completed ↓'}
</a>
