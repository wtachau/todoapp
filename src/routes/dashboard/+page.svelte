<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
	let creatingFor = $state<string | null>(null);
	let snoozing = $state<string | null>(null);
</script>

<!-- My Tasks -->
<div class="flex justify-between items-baseline mb-1 mt-2">
	<h2 class="text-[10px] font-bold tracking-[0.14em] uppercase text-stone-muted">My Tasks</h2>
	<a href="?showDone={!data.showDone}" class="text-[10px] tracking-wide text-stone hover:text-sage transition-colors">
		{data.showDone ? 'hide completed ↑' : 'show completed ↓'}
	</a>
</div>

{#if data.tasks.length === 0}
	<p class="text-stone text-sm py-4">No tasks.</p>
{:else}
	<div class="flex flex-col gap-1.5 mb-6">
		{#each data.tasks as task}
			<div class="bg-card border border-stone-light rounded-md px-3.5 py-2.5 grid grid-cols-[28px_1fr_auto_auto] gap-2 items-center hover:border-stone transition-colors"
				class:opacity-50={task.status === 'done'}>

				<!-- Status toggle -->
				<form method="POST" action="?/updateStatus" use:enhance style="display: contents">
					<input type="hidden" name="taskId" value={task.id} />
					<input type="hidden" name="status" value={task.status === 'done' ? 'todo' : 'done'} />
					<button type="submit"
						class="w-5 h-5 rounded border border-stone-light flex items-center justify-center text-xs cursor-pointer hover:border-sage transition-colors shrink-0"
						class:bg-sage={task.status === 'done'}
						class:border-sage={task.status === 'done'}
						class:text-white={task.status === 'done'}
					>
						{#if task.status === 'done'}✓{/if}
					</button>
				</form>

				<!-- Title + pills -->
				<div>
					<div class="text-sm" class:line-through={task.status === 'done'} class:text-stone={task.status === 'done'}>
						{task.title}
					</div>
					<div class="flex gap-1 mt-1 flex-wrap">
						{#if task.generatorId}
							<span class="text-[10px] font-bold tracking-[0.07em] uppercase px-2 py-0.5 rounded-full bg-[#f0e8d8] text-[#8a5020]">↺ recurring</span>
						{/if}
						{#if task.project.team.members && task.project.team.members.length > 1}
							<span class="text-[10px] font-bold tracking-[0.07em] uppercase px-2 py-0.5 rounded-full bg-sage-light text-sage">shared</span>
						{/if}
						<span class="text-[10px] font-bold tracking-[0.07em] uppercase px-2 py-0.5 rounded-full bg-stone-lighter text-stone">{task.project.name}</span>
					</div>
				</div>

				<!-- Age dot (placeholder — will be dynamic in Step 8) -->
				<div class="w-2.5 h-2.5 rounded-full bg-sage-muted shrink-0"></div>

				<!-- Snooze -->
				<button
					type="button"
					onclick={() => (snoozing = snoozing === task.id ? null : task.id)}
					class="text-[11px] tracking-wide border border-stone-light rounded px-2.5 py-1 text-stone hover:border-sage hover:text-sage transition-colors cursor-pointer whitespace-nowrap"
				>
					{snoozing === task.id ? 'cancel' : 'snooze'}
				</button>
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
		{/each}
	</div>
{/if}

<!-- Partner tasks inline -->
{#each data.partners as partner}
	<div class="bg-sage-light border border-[#c8d0c4] rounded-lg px-5 py-4 mb-6">
		<div class="text-[10px] font-bold tracking-[0.12em] uppercase text-sage mb-3">
			{partner.name ?? partner.email}'s tasks · shared projects
		</div>
		<a href="/dashboard/users/{partner.id}" class="text-xs text-sage-muted hover:text-sage transition-colors">
			View all →
		</a>
	</div>
{/each}

<hr class="border-stone-light my-8" />

<!-- Projects -->
<div class="text-[10px] font-bold tracking-[0.14em] uppercase text-stone-muted mb-3">Projects</div>

{#each data.teams as team}
	<div class="mb-6">
		<div class="text-xs font-bold tracking-wide text-stone uppercase mb-2">{team.name}</div>

		{#each team.projects as project}
			<div class="mb-1">
				<a href="/dashboard/projects/{project.id}" class="text-sm text-sage hover:underline">
					{project.name}
				</a>
			</div>
		{/each}

		{#if creatingFor === team.id}
			<form method="POST" action="?/createProject" use:enhance class="flex gap-2 mt-2">
				<input type="hidden" name="teamId" value={team.id} />
				<input
					name="name"
					placeholder="Project name"
					required
					autofocus
					class="flex-1 border border-stone-light rounded px-3 py-1.5 text-sm bg-white focus:border-sage focus:outline-none"
				/>
				<button type="submit" class="px-3 py-1.5 bg-sage text-white text-sm rounded hover:bg-sage/90 cursor-pointer">Add</button>
				<button type="button" onclick={() => (creatingFor = null)} class="px-3 py-1.5 text-sm text-stone hover:text-ink cursor-pointer">Cancel</button>
			</form>
		{:else}
			<button
				onclick={() => (creatingFor = team.id)}
				class="mt-1 text-xs text-stone hover:text-sage transition-colors cursor-pointer"
			>
				+ New project
			</button>
		{/if}
	</div>
{/each}
