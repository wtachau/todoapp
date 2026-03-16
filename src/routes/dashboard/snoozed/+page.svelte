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

<div class="flex items-baseline gap-3 mt-2 mb-6">
	<a href="/dashboard" class="text-xs text-stone hover:text-sage transition-colors">← back</a>
	<h1 class="text-[10px] font-bold tracking-[0.14em] uppercase text-stone-muted">Snoozed Tasks</h1>
</div>

{#if data.tasks.length === 0}
	<p class="text-stone text-sm py-4">No snoozed tasks.</p>
{:else}
	<div class="flex flex-col gap-1.5">
		{#each data.tasks as task}
			<div class="bg-card border border-stone-light rounded-md px-3.5 py-2.5 flex items-center gap-3 hover:border-stone transition-colors">
				<div class="flex-1">
					<div class="text-sm">{task.title}</div>
					<div class="flex gap-1 mt-1">
						<span class="text-[10px] font-bold tracking-[0.07em] uppercase px-2 py-0.5 rounded-full bg-stone-lighter text-stone">{task.project.name}</span>
					</div>
				</div>
				<span class="text-xs text-stone shrink-0">wakes {formatWakeDate(task.snoozedUntil!)}</span>
				<form method="POST" action="?/unsnooze" use:enhance>
					<input type="hidden" name="taskId" value={task.id} />
					<button type="submit" class="text-[11px] tracking-wide border border-stone-light rounded px-2.5 py-1 text-stone hover:border-sage hover:text-sage transition-colors cursor-pointer">
						un-snooze
					</button>
				</form>
			</div>
		{/each}
	</div>
{/if}
