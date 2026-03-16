<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();

	function formatWakeDate(d: Date | string) {
		return new Date(d).toLocaleDateString(undefined, {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<main class="p-8 max-w-2xl mx-auto">
	<p class="mb-4"><a href="/dashboard" class="text-blue-600 hover:underline">← Back</a></p>
	<h1 class="text-2xl font-bold mb-6">Snoozed Tasks</h1>

	{#if data.tasks.length === 0}
		<p class="text-gray-400">No snoozed tasks.</p>
	{:else}
		<ul class="list-none p-0">
			{#each data.tasks as task}
				<li class="flex items-center gap-3 py-2 border-b border-gray-100">
					<span>{task.title}</span>
					<span class="text-xs text-gray-400">
						{task.project.team.name} / {task.project.name}
					</span>
					<span class="ml-auto text-xs text-gray-400 shrink-0">
						wakes {formatWakeDate(task.snoozedUntil!)}
					</span>
					<form method="POST" action="?/unsnooze" use:enhance>
						<input type="hidden" name="taskId" value={task.id} />
						<button type="submit" class="text-xs text-blue-600 hover:underline cursor-pointer">
							Un-snooze
						</button>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
</main>
