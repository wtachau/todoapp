<svelte:head>
	<title>Tasks | Dashboard</title>
</svelte:head>

<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';

	let { data } = $props();
	let snoozing = $state<string | null>(null);

	function taskAge(createdAt: Date | string): string {
		const ms = Date.now() - new Date(createdAt).getTime();
		const mins = Math.floor(ms / 60000);
		if (mins < 60) return mins <= 1 ? 'just now' : `${mins} minutes ago`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
		const days = Math.floor(hours / 24);
		return days === 1 ? '1 day ago' : `${days} days ago`;
	}

	const filteredProject = $derived(
		data.projectFilter ? data.allProjects.find(p => p.id === data.projectFilter) : null
	);

	function filterUrl(params: Record<string, string | null>) {
		const u = new URL($page.url);
		for (const [k, v] of Object.entries(params)) {
			if (v === null) u.searchParams.delete(k);
			else u.searchParams.set(k, v);
		}
		return u.pathname + u.search;
	}
</script>

<!-- Filter chips -->
{#if data.allProjects.length > 1}
	<div class="flex gap-2 flex-wrap mt-2 mb-4">
		<a
			href={filterUrl({ project: null })}
			class="text-[10px] font-bold tracking-[0.07em] uppercase px-2.5 py-1 rounded-full transition-colors cursor-pointer"
			class:bg-sage={!data.projectFilter}
			class:text-white={!data.projectFilter}
			class:bg-stone-lighter={!!data.projectFilter}
			class:text-stone={!!data.projectFilter}
		>All</a>
		{#each data.allProjects as project}
			<a
				href={filterUrl({ project: project.id })}
				class="text-[10px] font-bold tracking-[0.07em] uppercase px-2.5 py-1 rounded-full transition-colors cursor-pointer"
				class:bg-sage={data.projectFilter === project.id}
				class:text-white={data.projectFilter === project.id}
				class:bg-stone-lighter={data.projectFilter !== project.id}
				class:text-stone={data.projectFilter !== project.id}
			>{project.name}</a>
		{/each}
	</div>
{/if}

<!-- Quick add -->
<form method="POST" action="?/createTask" use:enhance={() => async ({ update }) => { await update({ reset: true }); }} class="flex gap-2 mb-6">
	<input
		name="title"
		placeholder="Add a task…"
		required
		class="flex-1 border border-stone-light rounded-md px-3 py-2 text-sm bg-card focus:border-sage focus:outline-none"
	/>
	<select
		name="projectId"
		class="border border-stone-light rounded-md px-2 py-2 text-sm bg-card focus:border-sage focus:outline-none"
	>
		{#each data.accessibleProjects as project}
			<option value={project.id} selected={project.id === data.defaultProjectId}>{project.name}</option>
		{/each}
	</select>
	<button type="submit" class="px-4 py-2 bg-sage text-white text-sm rounded-md hover:bg-sage/90 cursor-pointer">Add</button>
</form>

<!-- Active tasks -->
<div class="flex justify-between items-baseline mb-2 mt-2">
	<h2 class="text-[10px] font-bold tracking-[0.14em] uppercase text-stone-muted">
		{#if filteredProject}
			{filteredProject.name}
		{:else}
			My Tasks
		{/if}
	</h2>
</div>

{#if data.activeTasks.length === 0}
	<p class="text-stone text-sm py-3">No active tasks.</p>
{:else}
	<div class="flex flex-col gap-1.5 mb-4">
		{#each data.activeTasks as task}
			{@render taskCard(task)}
		{/each}
	</div>
{/if}

<div class="flex gap-4 text-xs mb-8">
	<a href={filterUrl({ showDone: data.showDone ? null : 'true' })} class="text-stone hover:text-sage transition-colors">
		{data.showDone ? 'hide completed ↑' : 'show completed ↓'}
	</a>
	<a href="/dashboard/snoozed" class="text-stone hover:text-sage transition-colors">snoozed</a>
	{#each data.partners as partner}
		<a href="/dashboard/users/{partner.id}" class="text-stone hover:text-sage transition-colors">
			{partner.name ?? partner.email}'s tasks
		</a>
	{/each}
</div>

<!-- Completed tasks -->
{#if data.showDone && data.doneTasks.length > 0}
	<div class="text-[10px] font-bold tracking-[0.14em] uppercase text-stone-muted mb-2">Completed</div>
	<div class="flex flex-col gap-1.5 mb-8 opacity-60">
		{#each data.doneTasks as task}
			{@render taskCard(task)}
		{/each}
	</div>
{/if}

<!-- Partner section -->
{#each data.partners as partner}
	<div class="bg-sage-light border border-[#c8d0c4] rounded-lg px-5 py-4 mb-6">
		<div class="text-[10px] font-bold tracking-[0.12em] uppercase text-sage mb-2">
			{partner.name ?? partner.email}'s tasks · shared projects
		</div>
		<a href="/dashboard/users/{partner.id}" class="text-xs text-sage-muted hover:text-sage transition-colors">
			View all →
		</a>
	</div>
{/each}


{#snippet taskCard(task: typeof data.activeTasks[0])}
	<div class="bg-card border border-stone-light rounded-md px-3.5 py-2.5 grid grid-cols-[28px_1fr_auto_auto] gap-2 items-center hover:border-stone transition-colors">
		<form method="POST" action="?/updateStatus" use:enhance style="display: contents">
			<input type="hidden" name="taskId" value={task.id} />
			<input type="hidden" name="status" value={task.status === 'done' ? 'todo' : 'done'} />
			<button type="submit"
				class="w-5 h-5 rounded border flex items-center justify-center text-xs cursor-pointer hover:border-sage transition-colors shrink-0"
				class:bg-sage={task.status === 'done'}
				class:border-sage={task.status === 'done'}
				class:text-white={task.status === 'done'}
				class:border-stone-light={task.status !== 'done'}
			>
				{#if task.status === 'done'}✓{/if}
			</button>
		</form>

		<div>
			<div class="text-sm" class:line-through={task.status === 'done'} class:text-stone={task.status === 'done'}>
				{task.title}
			</div>
			<div class="flex gap-1 mt-1 flex-wrap">
				{#if task.generatorId}
					<span class="text-[10px] font-bold tracking-[0.07em] uppercase px-2 py-0.5 rounded-full bg-[#f0e8d8] text-[#8a5020]">↺ recurring</span>
				{/if}
				{#if task.project.team.members.length > 1}
					<span class="text-[10px] font-bold tracking-[0.07em] uppercase px-2 py-0.5 rounded-full bg-sage-light text-sage">shared</span>
				{/if}
				<span class="text-[10px] font-bold tracking-[0.07em] uppercase px-2 py-0.5 rounded-full bg-stone-lighter text-stone">{task.project.name}</span>
			</div>
		</div>

		<div class="relative group shrink-0 flex items-center justify-center">
			<div class="w-2.5 h-2.5 rounded-full bg-sage-muted cursor-default"></div>
			<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block whitespace-nowrap text-xs bg-ink text-white px-2 py-1 rounded pointer-events-none z-10">
				Created {taskAge(task.createdAt)}
			</div>
		</div>

		{#if task.status !== 'done'}
			<button
				type="button"
				onclick={() => (snoozing = snoozing === task.id ? null : task.id)}
				class="text-[11px] tracking-wide border border-stone-light rounded px-2.5 py-1 text-stone hover:border-sage hover:text-sage transition-colors cursor-pointer whitespace-nowrap"
			>
				{snoozing === task.id ? 'cancel' : 'snooze'}
			</button>
		{:else}
			<div></div>
		{/if}
	</div>

	{#if snoozing === task.id}
		<div class="flex gap-2 flex-wrap px-1 text-xs mb-1">
			{#each [['tomorrow', 'Tomorrow'], ['3days', 'In 3 days'], ['1week', '1 week']] as [preset, label]}
				<form method="POST" action="?/snooze" use:enhance={() => async ({ update }) => { snoozing = null; await update(); }}>
					<input type="hidden" name="taskId" value={task.id} />
					<input type="hidden" name="preset" value={preset} />
					<button type="submit" class="px-2.5 py-1 bg-stone-lighter hover:bg-stone-light rounded cursor-pointer transition-colors">
						{label}
					</button>
				</form>
			{/each}
			<form method="POST" action="?/snooze" use:enhance={() => async ({ update }) => { snoozing = null; await update(); }} class="flex gap-1">
				<input type="hidden" name="taskId" value={task.id} />
				<input type="date" name="customDate" required class="text-xs border border-stone-light rounded px-2 bg-white" />
				<button type="submit" class="px-2.5 py-1 bg-stone-lighter hover:bg-stone-light rounded cursor-pointer transition-colors">
					Snooze until →
				</button>
			</form>
		</div>
	{/if}
{/snippet}
