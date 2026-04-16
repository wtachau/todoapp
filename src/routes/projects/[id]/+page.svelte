<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatNextRun } from '$lib/taskUtils';
	import GeneratorFormFields from '$lib/components/GeneratorFormFields.svelte';

	let { data } = $props();
	let { project } = $derived(data);
	let members = $derived(project.team.members);
	let open = $state(false);
	let showDone = $state(false);

	// Create-generator form state
	let openGenerator = $state(false);
	let genDays = $state<string[]>([]);
	let genAdvanced = $state(false);
	let genRrule = $state('');
	let genRruleError = $state<string | null>(null);
	let genMode = $state<'fixed' | 'round_robin'>('round_robin');
	let genFixedAssigneeId = $state('');
	let genStartsWithId = $state('');

	// Edit-generator form state
	type Generator = typeof project.generators[0];
	let editingGen = $state<Generator | null>(null);
	let editGenDays = $state<string[]>([]);
	let editGenAdvanced = $state(false);
	let editGenRrule = $state('');
	let editGenRruleError = $state<string | null>(null);
	let editGenMode = $state<'fixed' | 'round_robin'>('round_robin');
	let editGenFixedAssigneeId = $state('');
	let editGenStartsWithId = $state('');

	function parseSimpleDays(rrule: string): string[] | null {
		const cleaned = rrule.replace('RRULE:', '');
		const match = cleaned.match(/^FREQ=WEEKLY(?:;BYDAY=([A-Z,]+))?(?:;.*)?$/);
		if (!match) return null;
		return match[1]?.split(',') ?? [];
	}

	function startEditing(gen: Generator) {
		editingGen = gen;
		editGenMode = gen.assignmentMode as 'fixed' | 'round_robin';
		const days = parseSimpleDays(gen.recurrenceRule);
		editGenAdvanced = days === null;
		editGenDays = days ?? [];
		editGenRrule = editGenAdvanced ? gen.recurrenceRule.replace('RRULE:', '') : '';
		editGenFixedAssigneeId = gen.fixedAssigneeId ?? '';
		editGenStartsWithId = '';
		editGenRruleError = null;
	}
</script>

<svelte:head>
	<title>Tasks | {project.name}</title>
</svelte:head>

<div class="flex items-baseline gap-3 mt-2 mb-1">
	<a href="/" class="text-xs text-stone hover:text-sage transition-colors">← dashboard</a>
	<span class="text-xs text-stone-light">/</span>
	<a href="/settings" class="text-xs text-stone hover:text-sage transition-colors">{project.team.name}</a>
	<span class="text-xs text-stone-light">/</span>
	<span class="text-xs text-stone">{project.name}</span>
</div>
<h1 class="text-xl font-semibold text-ink mb-1">{project.name}</h1>
<div class="text-xs text-stone-muted mb-6">Tasks · {project.team.name}</div>

<!-- Tasks -->
<div class="text-[10px] font-bold tracking-[0.14em] uppercase text-stone-muted mb-2">Tasks</div>

{#if project.tasks.length > 0}
	<div class="flex flex-col gap-1.5 mb-3">
		{#each project.tasks.filter(t => showDone || t.status !== 'done') as task}
			<div class="bg-card border border-stone-light rounded-md px-3.5 py-2.5 grid grid-cols-[28px_1fr_auto_auto] gap-2 items-center hover:border-stone transition-colors"
				class:opacity-50={task.status === 'done'}>
				<form method="POST" action="?/completeTask" use:enhance style="display: contents">
					<input type="hidden" name="taskId" value={task.id} />
					<button type="submit"
						class="w-5 h-5 rounded border border-stone-light flex items-center justify-center text-xs cursor-pointer hover:border-sage transition-colors shrink-0"
						class:bg-sage={task.status === 'done'}
						class:border-sage={task.status === 'done'}
						class:text-white={task.status === 'done'}
					>
						{#if task.status === 'done'}✓{/if}
					</button>
				</form>
				<div>
					<span class="text-sm" class:line-through={task.status === 'done'} class:text-stone={task.status === 'done'}>
						{task.title}
					</span>
				</div>
				<span class="text-xs text-stone shrink-0">{task.assignee.name ?? task.assignee.email}</span>
				<form method="POST" action="?/deleteTask" use:enhance>
					<input type="hidden" name="taskId" value={task.id} />
					<button type="submit" class="text-stone-light hover:text-red-400 transition-colors cursor-pointer text-sm">✕</button>
				</form>
			</div>
		{/each}
	</div>
	{#if project.tasks.some(t => t.status === 'done')}
		<button onclick={() => (showDone = !showDone)} class="text-xs text-stone hover:text-sage transition-colors cursor-pointer mb-3">
			{showDone ? 'hide completed ↑' : `show completed ↓`}
		</button>
	{/if}
{/if}

{#if open}
	<form
		method="POST"
		action="?/createTask"
		use:enhance={() => async ({ update }) => { open = false; await update(); }}
		class="flex flex-col gap-2 mb-4 p-3 bg-card border border-stone-light rounded-md"
	>
		<input name="title" placeholder="Task title" required autofocus
			class="border border-stone-light rounded px-3 py-1.5 text-sm bg-linen focus:border-sage focus:outline-none" />
		<select name="assignedTo" required
			class="border border-stone-light rounded px-3 py-1.5 text-sm bg-linen focus:border-sage focus:outline-none">
			<option value="">Assign to…</option>
			{#each members as m}
				<option value={m.userId}>{m.user.name ?? m.user.email}</option>
			{/each}
		</select>
		<div class="flex gap-2">
			<button type="submit" class="px-4 py-1.5 bg-sage text-white text-sm rounded hover:bg-sage/90 cursor-pointer">Add task</button>
			<button type="button" onclick={() => (open = false)} class="px-4 py-1.5 text-sm text-stone hover:text-ink cursor-pointer">Cancel</button>
		</div>
	</form>
{:else}
	<button onclick={() => (open = true)} class="text-xs text-stone hover:text-sage transition-colors cursor-pointer mb-8">
		+ New task
	</button>
{/if}

<!-- Task Generators -->
<div class="text-[10px] font-bold tracking-[0.14em] uppercase text-stone-muted mb-2 mt-8">Task Generators</div>

{#if project.generators.length > 0}
	<div class="flex flex-col gap-1.5 mb-3">
		{#each project.generators as gen}
			{#if editingGen?.id === gen.id}
				<form
					method="POST"
					action="?/updateGenerator"
					use:enhance={() => async ({ update }) => { editingGen = null; await update(); }}
					class="flex flex-col gap-3 p-3 bg-card border border-stone-light rounded-md"
				>
					<input type="hidden" name="generatorId" value={gen.id} />
					<input name="title" value={gen.title} required autofocus
						class="border border-stone-light rounded px-3 py-1.5 text-sm bg-linen focus:border-sage focus:outline-none" />

					<GeneratorFormFields
						{members}
						bind:days={editGenDays}
						bind:advanced={editGenAdvanced}
						bind:rrule={editGenRrule}
						bind:rruleError={editGenRruleError}
						bind:mode={editGenMode}
						bind:fixedAssigneeId={editGenFixedAssigneeId}
						bind:startsWithId={editGenStartsWithId}
					/>

					<div class="flex gap-2">
						<button type="submit" disabled={!!editGenRruleError} class="px-4 py-1.5 bg-sage text-white text-sm rounded hover:bg-sage/90 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">Save</button>
						<button type="button" onclick={() => (editingGen = null)} class="px-4 py-1.5 text-sm text-stone hover:text-ink cursor-pointer">Cancel</button>
					</div>
				</form>
			{:else}
				<div class="bg-card border border-stone-light rounded-md px-3.5 py-2.5 flex items-center gap-3 hover:border-stone transition-colors">
					<div class="flex-1">
						<div class="text-sm font-medium">{gen.title}</div>
						<div class="text-xs text-stone mt-0.5">
							<span class="font-semibold text-ink">
								{gen.assignmentMode === 'fixed'
									? `always → ${gen.fixedAssignee?.name ?? gen.fixedAssignee?.email ?? '?'}`
									: 'round-robin'}
							</span>
							· {gen.rruleText}
							· next run: {formatNextRun(gen.nextRunAt)}
							{#if gen.nextAssigneeName}
								<span class="text-stone-muted">({gen.nextAssigneeName})</span>
							{/if}
						</div>
					</div>
					<button type="button" onclick={() => startEditing(gen)} class="text-stone-light hover:text-sage transition-colors cursor-pointer" title="Edit">
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
					</button>
					<form method="POST" action="?/deleteGenerator" use:enhance>
						<input type="hidden" name="generatorId" value={gen.id} />
						<button type="submit" class="text-stone-light hover:text-red-400 transition-colors cursor-pointer text-sm">✕</button>
					</form>
				</div>
			{/if}
		{/each}
	</div>
{/if}

{#if openGenerator}
	<form
		method="POST"
		action="?/createGenerator"
		use:enhance={() => async ({ update }) => { openGenerator = false; genMode = 'round_robin'; genAdvanced = false; await update(); }}
		class="flex flex-col gap-3 p-3 bg-card border border-stone-light rounded-md mb-4"
	>
		<input name="title" placeholder="e.g. Take out trash" required autofocus
			class="border border-stone-light rounded px-3 py-1.5 text-sm bg-linen focus:border-sage focus:outline-none" />

		<GeneratorFormFields
			{members}
			bind:days={genDays}
			bind:advanced={genAdvanced}
			bind:rrule={genRrule}
			bind:rruleError={genRruleError}
			bind:mode={genMode}
			bind:fixedAssigneeId={genFixedAssigneeId}
			bind:startsWithId={genStartsWithId}
		/>

		<div class="flex gap-2">
			<button type="submit" disabled={!!genRruleError} class="px-4 py-1.5 bg-sage text-white text-sm rounded hover:bg-sage/90 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">Add generator</button>
			<button type="button" onclick={() => (openGenerator = false)} class="px-4 py-1.5 text-sm text-stone hover:text-ink cursor-pointer">Cancel</button>
		</div>
	</form>
{:else}
	<button onclick={() => (openGenerator = true)} class="text-xs text-stone hover:text-sage transition-colors cursor-pointer">
		+ New generator
	</button>
{/if}
