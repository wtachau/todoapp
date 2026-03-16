<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
	let creatingFor = $state<string | null>(null);
	let snoozing = $state<string | null>(null);
</script>

<main class="p-8 max-w-2xl mx-auto">
	<h1 class="text-2xl font-bold mb-2">My Tasks</h1>

	<div class="flex gap-4 text-sm mb-6">
		<a href="/dashboard/snoozed" class="text-blue-600 hover:underline">Snoozed tasks</a>
		{#each data.partners as partner}
			<a href="/dashboard/users/{partner.id}" class="text-blue-600 hover:underline">
				{partner.name ?? partner.email}'s tasks
			</a>
		{/each}
	</div>

	{#if data.tasks.length === 0}
		<p class="text-gray-400">No tasks.</p>
	{:else}
		<ul class="list-none p-0 mb-6">
			{#each data.tasks as task}
				<li class="py-2 border-b border-gray-100">
					<div class="flex items-center gap-3">
						<form method="POST" action="?/updateStatus" use:enhance style="display: contents">
							<input type="hidden" name="taskId" value={task.id} />
							<select
								name="status"
								value={task.status}
								onchange={(e) => e.currentTarget.form?.requestSubmit()}
								class="text-xs border border-gray-200 rounded px-1 py-0.5"
							>
								<option value="todo">To do</option>
								<option value="in_progress">In progress</option>
								<option value="done">Done</option>
							</select>
						</form>
						<span class={task.status === 'done' ? 'line-through text-gray-400' : ''}>
							{task.title}
						</span>
						<span class="ml-auto text-xs text-gray-400 shrink-0">
							{task.project.team.name} / {task.project.name}
						</span>
						<button
							type="button"
							onclick={() => (snoozing = snoozing === task.id ? null : task.id)}
							class="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
						>
							{snoozing === task.id ? 'Cancel' : 'Snooze'}
						</button>
					</div>

					{#if snoozing === task.id}
						<div class="flex gap-2 flex-wrap mt-2 text-xs">
							{#each [['tomorrow', 'Tomorrow'], ['3days', 'In 3 days'], ['1week', '1 week']] as [preset, label]}
								<form method="POST" action="?/snooze" use:enhance={() => async ({ update }) => { snoozing = null; await update(); }}>
									<input type="hidden" name="taskId" value={task.id} />
									<input type="hidden" name="preset" value={preset} />
									<button type="submit" class="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded cursor-pointer">
										{label}
									</button>
								</form>
							{/each}
							<form method="POST" action="?/snooze" use:enhance={() => async ({ update }) => { snoozing = null; await update(); }} class="flex gap-1">
								<input type="hidden" name="taskId" value={task.id} />
								<input type="date" name="customDate" required class="text-xs border border-gray-200 rounded px-1" />
								<button type="submit" class="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded cursor-pointer">
									Snooze until →
								</button>
							</form>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	<a href="?showDone={!data.showDone}" class="text-sm text-blue-600 hover:underline">
		{data.showDone ? 'Hide completed' : 'Show completed'}
	</a>

	<hr class="my-8 border-gray-200" />

	<h2 class="text-xl font-semibold mb-4">Projects</h2>

	{#each data.teams as team}
		<section class="mb-8">
			<h3 class="text-base font-medium text-gray-500 mb-2">{team.name}</h3>

			{#each team.projects as project}
				<div class="mb-1">
					<a href="/dashboard/projects/{project.id}" class="text-blue-600 hover:underline">
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
						class="border border-gray-200 rounded px-2 py-1 text-sm"
					/>
					<button type="submit" class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Add</button>
					<button type="button" onclick={() => (creatingFor = null)} class="px-3 py-1 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
				</form>
			{:else}
				<button
					onclick={() => (creatingFor = team.id)}
					class="mt-2 text-sm text-blue-600 hover:underline cursor-pointer"
				>
					+ New project
				</button>
			{/if}
		</section>
	{/each}
</main>
