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

<main style="padding: 2rem; max-width: 640px">
	<p><a href="/dashboard">← Back</a></p>
	<h1>Snoozed Tasks</h1>

	{#if data.tasks.length === 0}
		<p style="color: #888">No snoozed tasks.</p>
	{:else}
		<ul style="list-style: none; padding: 0">
			{#each data.tasks as task}
				<li style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0; border-bottom: 1px solid #eee">
					<span>{task.title}</span>
					<span style="font-size: 0.75rem; color: #888">
						{task.project.team.name} / {task.project.name}
					</span>
					<span style="margin-left: auto; font-size: 0.75rem; color: #888">
						wakes {formatWakeDate(task.snoozedUntil!)}
					</span>
					<form method="POST" action="?/unsnooze" use:enhance>
						<input type="hidden" name="taskId" value={task.id} />
						<button type="submit" style="font-size: 0.75rem; cursor: pointer">Un-snooze</button>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
</main>
