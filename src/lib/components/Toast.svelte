<script lang="ts">
	import { toastState } from '$lib/toast.svelte.ts';
</script>

{#if toastState.message}
	<div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-ink text-white text-sm rounded-lg shadow-lg pointer-events-none"
		style="animation: fadeup 0.15s ease-out">
		{toastState.message}
	</div>
{/if}

<style>
	@keyframes fadeup {
		from { opacity: 0; transform: translateX(-50%) translateY(6px); }
		to   { opacity: 1; transform: translateX(-50%) translateY(0); }
	}
</style>
