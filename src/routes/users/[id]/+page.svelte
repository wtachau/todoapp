<script lang="ts">
	import { enhance } from '$app/forms';
	import { ageColor as _ageColor } from '$lib/taskUtils';
	import AgeDot from '$lib/components/AgeDot.svelte';

	let { data } = $props();
	const name = $derived(data.partner.name ?? data.partner.email);
	const ageColor = (createdAt: Date | string) => _ageColor(createdAt, data.urgencyDays);

	let scheduling = $state(false);
	let scheduledDate = $state('');
	let dropdownOpen = $state(false);

	const inProgressTasks = $derived(data.tasks.filter((t) => t.status === 'in_progress'));
	const todoTasks = $derived(data.tasks.filter((t) => t.status === 'todo'));
</script>

<svelte:head>
	<title>Tasks | {name}'s tasks</title>
</svelte:head>

<div class="flex items-baseline gap-3 mt-2 mb-6">
	<a href="/" class="text-xs text-stone hover:text-sage transition-colors">← back</a>
	<h2 class="text-[10px] font-bold tracking-[0.14em] uppercase text-stone-muted">{name}'s tasks · shared projects</h2>
</div>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<form
	method="POST"
	action="?/createTask"
	use:enhance={() => {
		return async ({ update }) => {
			scheduling = false;
			scheduledDate = '';
			await update({ reset: true });
		};
	}}
	class="mb-6"
>
	<input type="hidden" name="projectId" value={data.sharedProjects[0]?.id} />

	<div class="relative">
		<div class="flex items-stretch border border-stone-light rounded-md bg-card focus-within:border-sage transition-colors overflow-hidden">
			<input
				name="title"
				placeholder="Add a task for {name}…"
				required
				class="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none min-w-0"
			/>
			{#if scheduling}
				<input
					type="date"
					name="scheduledFor"
					bind:value={scheduledDate}
					required
					min={new Date().toISOString().split('T')[0]}
					class="w-32 px-2 py-2.5 text-sm bg-transparent border-l border-stone-light focus:outline-none cursor-pointer"
					class:text-sage={scheduledDate}
					class:text-stone-light={!scheduledDate}
				/>
			{/if}
			<div class="flex items-stretch border-l border-stone-light">
				<button
					type="submit"
					class="px-4 text-sm text-sage font-medium hover:bg-sage-light cursor-pointer transition-colors whitespace-nowrap"
				>{scheduling ? 'Schedule' : 'Add'}</button>
				<button
					type="button"
					onclick={() => (dropdownOpen = !dropdownOpen)}
					class="border-l border-stone-light px-2 text-stone hover:bg-sage-light cursor-pointer transition-colors text-xs"
				>▾</button>
			</div>
		</div>
		{#if dropdownOpen}
			<div class="fixed inset-0 z-10" onclick={() => (dropdownOpen = false)}></div>
			<div class="absolute right-0 top-full mt-1 bg-card border border-stone-light rounded-md shadow-md z-20 w-36 py-1">
				<button
					type="button"
					onclick={() => { scheduling = !scheduling; if (!scheduling) scheduledDate = ''; dropdownOpen = false; }}
					class="w-full text-left px-3 py-2 text-sm text-ink hover:bg-sage-light cursor-pointer transition-colors"
				>{scheduling ? 'Add' : 'Schedule'}</button>
			</div>
		{/if}
	</div>
</form>

{#snippet taskRow(task: typeof data.tasks[0])}
	<div class="bg-card border border-stone-light rounded-md px-3.5 py-2.5 flex items-center gap-3 hover:border-stone transition-colors"
		class:opacity-50={task.status === 'done'}>
		<AgeDot createdAt={task.createdAt} color={ageColor(task.createdAt)} />
		<div class="flex-1">
			<div class="text-sm" class:line-through={task.status === 'done'} class:text-stone={task.status === 'done'}>
				{task.title}
			</div>
			<div class="flex gap-1 mt-1 flex-wrap items-center">
				<span class="text-xs text-stone">{new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
				<span class="text-xs text-stone">·</span>
				<span class="text-[10px] font-bold tracking-[0.07em] uppercase px-2 py-0.5 rounded-full bg-stone-lighter text-stone">{task.project.name}</span>
			</div>
		</div>
	</div>
{/snippet}

{#if inProgressTasks.length > 0}
	<h2 class="text-[10px] font-bold tracking-[0.14em] uppercase text-stone-muted mb-2">In Progress</h2>
	<div class="flex flex-col gap-1.5 mb-4">
		{#each inProgressTasks as task}{@render taskRow(task)}{/each}
	</div>
{/if}

{#if todoTasks.length > 0}
	<h2 class="text-[10px] font-bold tracking-[0.14em] uppercase text-stone-muted mb-2">To Do</h2>
	<div class="flex flex-col gap-1.5 mb-4">
		{#each todoTasks as task}{@render taskRow(task)}{/each}
	</div>
{/if}

{#if data.tasks.length === 0}
	<p class="text-stone text-sm py-4">No tasks.</p>
{/if}

<a href="?showDone={!data.showDone}" class="text-xs text-stone hover:text-sage transition-colors">
	{data.showDone ? 'hide completed ↑' : 'show completed ↓'}
</a>
