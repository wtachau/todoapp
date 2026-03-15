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

<main style="padding: 2rem; max-width: 640px">
	<a href="/dashboard">← Dashboard</a>
	<h1>{project.name}</h1>

	<!-- Tasks -->
	<ul style="padding: 0; list-style: none">
		{#each project.tasks as task}
			<li style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0; border-bottom: 1px solid #eee">
				<form method="POST" action="?/completeTask" use:enhance>
					<input type="hidden" name="taskId" value={task.id} />
					<button type="submit" style="cursor: pointer">
						{task.status === 'done' ? '☑' : '☐'}
					</button>
				</form>
				<span style={task.status === 'done' ? 'text-decoration: line-through; color: #999' : ''}>
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

	<!-- Task Generators -->
	<h2 style="margin-top: 2.5rem">Task Generators</h2>

	{#each project.generators as gen}
		<div style="padding: 0.5rem 0; border-bottom: 1px solid #eee; display: flex; align-items: flex-start; gap: 0.75rem">
			<div style="flex: 1">
				<div><strong>{gen.title}</strong></div>
				<div style="font-size: 0.85rem; color: #666">
					{gen.assignmentMode === 'fixed'
						? `Always → ${gen.fixedAssignee?.name ?? gen.fixedAssignee?.email ?? '?'}`
						: 'Round-robin'}
					· {gen.recurrenceRule.replace('RRULE:', '')}
					· next: {formatNextRun(gen.nextRunAt)}
				</div>
			</div>
			<form method="POST" action="?/deleteGenerator" use:enhance>
				<input type="hidden" name="generatorId" value={gen.id} />
				<button type="submit" style="color: #c00; cursor: pointer">✕</button>
			</form>
		</div>
	{/each}

	{#if openGenerator}
		<form
			method="POST"
			action="?/createGenerator"
			use:enhance={() => async ({ update }) => { openGenerator = false; genMode = 'round_robin'; genAdvanced = false; await update(); }}
			style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem"
		>
			<input name="title" placeholder="e.g. Take out trash" required autofocus />
			<input type="hidden" name="advanced" value={genAdvanced ? 'true' : 'false'} />

			{#if genAdvanced}
				<input name="rrule" placeholder="FREQ=DAILY;INTERVAL=2" required style="font-family: monospace" />
				<div style="font-size: 0.8rem; color: #888">
					e.g. <code>FREQ=DAILY;INTERVAL=2</code> · <code>FREQ=WEEKLY;BYDAY=MO,WE,FR</code>
				</div>
			{:else}
				<div style="display: flex; gap: 0.5rem; flex-wrap: wrap">
					{#each DAYS as day}
						<label>
							<input type="checkbox" name="days" value={day} />
							{DAY_LABELS[day]}
						</label>
					{/each}
				</div>
			{/if}

			<button type="button" onclick={() => (genAdvanced = !genAdvanced)} style="align-self: flex-start; font-size: 0.8rem; background: none; border: none; padding: 0; cursor: pointer; color: #666; text-decoration: underline">
				{genAdvanced ? '← Simple' : 'Advanced (RRULE)'}
			</button>

			<div style="display: flex; gap: 1rem">
				<label>
					<input type="radio" name="assignmentMode" value="round_robin" checked={genMode === 'round_robin'} onchange={() => (genMode = 'round_robin')} />
					Round-robin
				</label>
				<label>
					<input type="radio" name="assignmentMode" value="fixed" checked={genMode === 'fixed'} onchange={() => (genMode = 'fixed')} />
					Fixed
				</label>
			</div>

			{#if genMode === 'fixed'}
				<select name="fixedAssigneeId" required>
					<option value="">Assign to…</option>
					{#each members as m}
						<option value={m.userId}>{m.user.name ?? m.user.email}</option>
					{/each}
				</select>
			{:else}
				<select name="startsWithId">
					<option value="">Starts with… (optional)</option>
					{#each members as m}
						<option value={m.userId}>{m.user.name ?? m.user.email}</option>
					{/each}
				</select>
			{/if}

			<div style="display: flex; gap: 0.5rem">
				<button type="submit">Add generator</button>
				<button type="button" onclick={() => (openGenerator = false)}>Cancel</button>
			</div>
		</form>
	{:else}
		<button onclick={() => (openGenerator = true)} style="margin-top: 1rem">+ New generator</button>
	{/if}
</main>
