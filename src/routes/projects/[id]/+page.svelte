<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatNextRun } from '$lib/taskUtils';

	let { data } = $props();
	let { project } = $derived(data);
	let members = $derived(project.team.members);
	let open = $state(false);
	let showDone = $state(false);
	let openGenerator = $state(false);
	let genMode = $state<'fixed' | 'round_robin'>('round_robin');
	let genAdvanced = $state(false);

	type Generator = typeof project.generators[0];
	let editingGen = $state<Generator | null>(null);
	let editGenMode = $state<'fixed' | 'round_robin'>('round_robin');
	let editGenAdvanced = $state(false);
	let editGenDays = $state<string[]>([]);

	const DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
	const DAY_LABELS: Record<string, string> = {
		MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun'
	};

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
					<input type="hidden" name="advanced" value={editGenAdvanced ? 'true' : 'false'} />

					{#if editGenAdvanced}
						<input name="rrule" value={gen.recurrenceRule.replace('RRULE:', '')} required
							class="border border-stone-light rounded px-3 py-1.5 text-sm font-mono bg-linen focus:border-sage focus:outline-none" />
					{:else}
						<div class="flex gap-3 flex-wrap">
							{#each DAYS as day}
								<label class="flex items-center gap-1 text-sm cursor-pointer text-stone hover:text-ink">
									<input type="checkbox" name="days" value={day} checked={editGenDays.includes(day)} class="accent-sage" />
									{DAY_LABELS[day]}
								</label>
							{/each}
						</div>
					{/if}

					<button type="button" onclick={() => (editGenAdvanced = !editGenAdvanced)}
						class="self-start text-xs text-stone hover:text-sage underline cursor-pointer">
						{editGenAdvanced ? '← simple' : 'advanced (rrule)'}
					</button>

					<div class="flex gap-4">
						<label class="flex items-center gap-1.5 text-sm cursor-pointer">
							<input type="radio" name="assignmentMode" value="round_robin" checked={editGenMode === 'round_robin'} onchange={() => (editGenMode = 'round_robin')} class="accent-sage" />
							<span class="text-stone">Round-robin</span>
						</label>
						<label class="flex items-center gap-1.5 text-sm cursor-pointer">
							<input type="radio" name="assignmentMode" value="fixed" checked={editGenMode === 'fixed'} onchange={() => (editGenMode = 'fixed')} class="accent-sage" />
							<span class="text-stone">Fixed</span>
						</label>
					</div>

					{#if editGenMode === 'fixed'}
						<select name="fixedAssigneeId" required
							class="border border-stone-light rounded px-3 py-1.5 text-sm bg-linen focus:border-sage focus:outline-none">
							{#each members as m}
								<option value={m.userId} selected={gen.fixedAssigneeId === m.userId}>{m.user.name ?? m.user.email}</option>
							{/each}
						</select>
					{:else}
						<select name="startsWithId"
							class="border border-stone-light rounded px-3 py-1.5 text-sm bg-linen focus:border-sage focus:outline-none">
							<option value="">Keep current rotation</option>
							{#each members as m}
								<option value={m.userId}>{m.user.name ?? m.user.email} goes next</option>
							{/each}
						</select>
					{/if}

					<div class="flex gap-2">
						<button type="submit" class="px-4 py-1.5 bg-sage text-white text-sm rounded hover:bg-sage/90 cursor-pointer">Save</button>
						<button type="button" onclick={() => (editingGen = null)} class="px-4 py-1.5 text-sm text-stone hover:text-ink cursor-pointer">Cancel</button>
					</div>
				</form>
			{:else}
				<div class="bg-card border border-stone-light rounded-md px-3.5 py-2.5 flex items-center gap-3 hover:border-stone transition-colors">
					<div class="flex-1">
						<div class="text-sm font-medium">{gen.title}</div>
						<div class="text-xs text-stone mt-0.5">
							{gen.assignmentMode === 'fixed'
								? `always → ${gen.fixedAssignee?.name ?? gen.fixedAssignee?.email ?? '?'}`
								: 'round-robin'}
							· {gen.recurrenceRule.replace('RRULE:', '')}
							· next: {formatNextRun(gen.nextRunAt)}
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
		<input type="hidden" name="advanced" value={genAdvanced ? 'true' : 'false'} />

		{#if genAdvanced}
			<input name="rrule" placeholder="FREQ=DAILY;INTERVAL=2" required
				class="border border-stone-light rounded px-3 py-1.5 text-sm font-mono bg-linen focus:border-sage focus:outline-none" />
			<p class="text-xs text-stone">
				e.g. <code>FREQ=DAILY;INTERVAL=2</code> · <code>FREQ=WEEKLY;BYDAY=MO,WE,FR</code>
			</p>
		{:else}
			<div class="flex gap-3 flex-wrap">
				{#each DAYS as day}
					<label class="flex items-center gap-1 text-sm cursor-pointer text-stone hover:text-ink">
						<input type="checkbox" name="days" value={day} class="accent-sage" />
						{DAY_LABELS[day]}
					</label>
				{/each}
			</div>
		{/if}

		<button
			type="button"
			onclick={() => (genAdvanced = !genAdvanced)}
			class="self-start text-xs text-stone hover:text-sage underline cursor-pointer"
		>
			{genAdvanced ? '← simple' : 'advanced (rrule)'}
		</button>

		<div class="flex gap-4">
			<label class="flex items-center gap-1.5 text-sm cursor-pointer">
				<input type="radio" name="assignmentMode" value="round_robin" checked={genMode === 'round_robin'} onchange={() => (genMode = 'round_robin')} class="accent-sage" />
				<span class="text-stone">Round-robin</span>
			</label>
			<label class="flex items-center gap-1.5 text-sm cursor-pointer">
				<input type="radio" name="assignmentMode" value="fixed" checked={genMode === 'fixed'} onchange={() => (genMode = 'fixed')} class="accent-sage" />
				<span class="text-stone">Fixed</span>
			</label>
		</div>

		{#if genMode === 'fixed'}
			<select name="fixedAssigneeId" required
				class="border border-stone-light rounded px-3 py-1.5 text-sm bg-linen focus:border-sage focus:outline-none">
				<option value="">Assign to…</option>
				{#each members as m}
					<option value={m.userId}>{m.user.name ?? m.user.email}</option>
				{/each}
			</select>
		{:else}
			<select name="startsWithId"
				class="border border-stone-light rounded px-3 py-1.5 text-sm bg-linen focus:border-sage focus:outline-none">
				<option value="">Starts with… (optional)</option>
				{#each members as m}
					<option value={m.userId}>{m.user.name ?? m.user.email}</option>
				{/each}
			</select>
		{/if}

		<div class="flex gap-2">
			<button type="submit" class="px-4 py-1.5 bg-sage text-white text-sm rounded hover:bg-sage/90 cursor-pointer">Add generator</button>
			<button type="button" onclick={() => (openGenerator = false)} class="px-4 py-1.5 text-sm text-stone hover:text-ink cursor-pointer">Cancel</button>
		</div>
	</form>
{:else}
	<button onclick={() => (openGenerator = true)} class="text-xs text-stone hover:text-sage transition-colors cursor-pointer">
		+ New generator
	</button>
{/if}
