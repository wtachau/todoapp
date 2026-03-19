<script lang="ts">
	import { ageColor as _ageColor, taskAge } from '$lib/taskUtils';

	let { data } = $props();
	const name = $derived(data.partner.name ?? data.partner.email);
	const ageColor = (createdAt: Date | string) => _ageColor(createdAt, data.urgencyDays);
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
				<div class="relative group shrink-0 flex items-center justify-center">
					<div class="w-2.5 h-2.5 rounded-full cursor-default" style="background-color: {ageColor(task.createdAt)}"></div>
					<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block whitespace-nowrap text-xs bg-ink text-white px-2 py-1 rounded pointer-events-none z-10">
						Created {taskAge(task.createdAt)}
					</div>
				</div>
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
