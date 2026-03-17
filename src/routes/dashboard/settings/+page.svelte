<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let saved = $state(false);
</script>

<div class="flex items-baseline gap-3 mt-2 mb-6">
	<a href="/dashboard" class="text-xs text-stone hover:text-sage transition-colors">← dashboard</a>
</div>
<h1 class="text-xl font-semibold text-ink mb-6">Settings</h1>

<div class="text-[10px] font-bold tracking-[0.14em] uppercase text-stone-muted mb-4">Task Urgency</div>

<form
	method="POST"
	action="?/updateUrgency"
	use:enhance={() => async ({ update }) => { await update(); saved = true; setTimeout(() => saved = false, 2000); }}
	class="flex flex-col gap-4 max-w-sm"
>
	<div>
		<label class="block text-sm text-stone mb-1" for="urgencyDays">
			Urgency window (days)
		</label>
		<p class="text-xs text-stone-muted mb-2">
			Tasks turn amber halfway through this window and red at the end. The dot color resets only when the task is completed.
		</p>
		<input
			id="urgencyDays"
			name="urgencyDays"
			type="number"
			min="1"
			max="365"
			value={data.urgencyDays}
			required
			class="border border-stone-light rounded px-3 py-1.5 text-sm bg-white focus:border-sage focus:outline-none w-24"
		/>
	</div>

	{#if form?.error}
		<p class="text-xs text-red-500">{form.error}</p>
	{/if}

	<div class="flex items-center gap-3">
		<button type="submit" class="px-4 py-1.5 bg-sage text-white text-sm rounded hover:bg-sage/90 cursor-pointer">
			Save
		</button>
		{#if saved}
			<span class="text-xs text-sage">Saved!</span>
		{/if}
	</div>
</form>
