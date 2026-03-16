<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
	let { project } = $derived(data);
	let members = $derived(project.team.members);
	let open = $state(false);
	let openGenerator = $state(false);
	let genMode = $state<'fixed' | 'round_robin'>('round_robin');
	let genAdvanced = $state(false);

	const DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
	const DAY_LABELS: Record<string, string> = {
		MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun'
	};

	function formatNextRun(d: Date | string) {
		return new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
	}
</script>

<main class="p-8 max-w-2xl mx-auto">
	<a href="/dashboard" class="text-blue-600 hover:underline text-sm">← Dashboard</a>
	<h1 class="text-2xl font-bold mt-2 mb-6">{project.name}</h1>

	<!-- Tasks -->
	<ul class="list-none p-0 mb-4">
		{#each project.tasks as task}
			<li class="flex items-center gap-3 py-2 border-b border-gray-100">
				<form method="POST" action="?/completeTask" use:enhance style="display: contents">
					<input type="hidden" name="taskId" value={task.id} />
					<button type="submit" class="text-lg cursor-pointer leading-none">
						{task.status === 'done' ? '☑' : '☐'}
					</button>
				</form>
				<span class={task.status === 'done' ? 'line-through text-gray-400' : ''}>
					{task.title}
				</span>
				<span class="ml-auto text-sm text-gray-500 shrink-0">
					{task.assignee.name ?? task.assignee.email}
				</span>
				<form method="POST" action="?/deleteTask" use:enhance>
					<input type="hidden" name="taskId" value={task.id} />
					<button type="submit" class="text-red-400 hover:text-red-600 cursor-pointer">✕</button>
				</form>
			</li>
		{/each}
	</ul>

	{#if open}
		<form
			method="POST"
			action="?/createTask"
			use:enhance={() => async ({ update }) => { open = false; await update(); }}
			class="flex flex-col gap-2 mt-4"
		>
			<input name="title" placeholder="Task title" required autofocus
				class="border border-gray-200 rounded px-3 py-2 text-sm" />
			<select name="assignedTo" required class="border border-gray-200 rounded px-3 py-2 text-sm">
				<option value="">Assign to…</option>
				{#each members as m}
					<option value={m.userId}>{m.user.name ?? m.user.email}</option>
				{/each}
			</select>
			<div class="flex gap-2">
				<button type="submit" class="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Add task</button>
				<button type="button" onclick={() => (open = false)} class="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
			</div>
		</form>
	{:else}
		<button onclick={() => (open = true)} class="mt-2 text-sm text-blue-600 hover:underline cursor-pointer">
			+ New task
		</button>
	{/if}

	<!-- Task Generators -->
	<h2 class="text-xl font-semibold mt-10 mb-4">Task Generators</h2>

	{#each project.generators as gen}
		<div class="flex items-start gap-3 py-3 border-b border-gray-100">
			<div class="flex-1">
				<div class="font-medium">{gen.title}</div>
				<div class="text-sm text-gray-500 mt-0.5">
					{gen.assignmentMode === 'fixed'
						? `Always → ${gen.fixedAssignee?.name ?? gen.fixedAssignee?.email ?? '?'}`
						: 'Round-robin'}
					· {gen.recurrenceRule.replace('RRULE:', '')}
					· next: {formatNextRun(gen.nextRunAt)}
				</div>
			</div>
			<form method="POST" action="?/deleteGenerator" use:enhance>
				<input type="hidden" name="generatorId" value={gen.id} />
				<button type="submit" class="text-red-400 hover:text-red-600 cursor-pointer">✕</button>
			</form>
		</div>
	{/each}

	{#if openGenerator}
		<form
			method="POST"
			action="?/createGenerator"
			use:enhance={() => async ({ update }) => { openGenerator = false; genMode = 'round_robin'; genAdvanced = false; await update(); }}
			class="flex flex-col gap-3 mt-4"
		>
			<input name="title" placeholder="e.g. Take out trash" required autofocus
				class="border border-gray-200 rounded px-3 py-2 text-sm" />
			<input type="hidden" name="advanced" value={genAdvanced ? 'true' : 'false'} />

			{#if genAdvanced}
				<input name="rrule" placeholder="FREQ=DAILY;INTERVAL=2" required
					class="border border-gray-200 rounded px-3 py-2 text-sm font-mono" />
				<p class="text-xs text-gray-400">
					e.g. <code>FREQ=DAILY;INTERVAL=2</code> · <code>FREQ=WEEKLY;BYDAY=MO,WE,FR</code>
				</p>
			{:else}
				<div class="flex gap-3 flex-wrap">
					{#each DAYS as day}
						<label class="flex items-center gap-1 text-sm cursor-pointer">
							<input type="checkbox" name="days" value={day} />
							{DAY_LABELS[day]}
						</label>
					{/each}
				</div>
			{/if}

			<button
				type="button"
				onclick={() => (genAdvanced = !genAdvanced)}
				class="self-start text-xs text-gray-500 hover:text-gray-700 underline cursor-pointer"
			>
				{genAdvanced ? '← Simple' : 'Advanced (RRULE)'}
			</button>

			<div class="flex gap-4">
				<label class="flex items-center gap-1 text-sm cursor-pointer">
					<input type="radio" name="assignmentMode" value="round_robin" checked={genMode === 'round_robin'} onchange={() => (genMode = 'round_robin')} />
					Round-robin
				</label>
				<label class="flex items-center gap-1 text-sm cursor-pointer">
					<input type="radio" name="assignmentMode" value="fixed" checked={genMode === 'fixed'} onchange={() => (genMode = 'fixed')} />
					Fixed
				</label>
			</div>

			{#if genMode === 'fixed'}
				<select name="fixedAssigneeId" required class="border border-gray-200 rounded px-3 py-2 text-sm">
					<option value="">Assign to…</option>
					{#each members as m}
						<option value={m.userId}>{m.user.name ?? m.user.email}</option>
					{/each}
				</select>
			{:else}
				<select name="startsWithId" class="border border-gray-200 rounded px-3 py-2 text-sm">
					<option value="">Starts with… (optional)</option>
					{#each members as m}
						<option value={m.userId}>{m.user.name ?? m.user.email}</option>
					{/each}
				</select>
			{/if}

			<div class="flex gap-2">
				<button type="submit" class="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Add generator</button>
				<button type="button" onclick={() => (openGenerator = false)} class="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
			</div>
		</form>
	{:else}
		<button onclick={() => (openGenerator = true)} class="mt-4 text-sm text-blue-600 hover:underline cursor-pointer">
			+ New generator
		</button>
	{/if}
</main>
