<script lang="ts">
	import '../app.css';
	let { data, children } = $props();
	const isAuthed = $derived(!!data.session?.user);
</script>

{#if isAuthed}
	<div class="min-h-screen bg-linen">
		<header class="flex justify-between items-baseline px-8 py-5">
			<a href="/dashboard" class="font-serif italic text-sage text-xl no-underline">shared tasks</a>
			<nav class="flex gap-5 text-xs tracking-wide text-stone">
				<a href="/dashboard" class="hover:text-sage transition-colors">dashboard</a>
				<a href="/dashboard/snoozed" class="hover:text-sage transition-colors">snoozed</a>
				<a href="/dashboard/settings" class="hover:text-sage transition-colors">settings</a>
				{#if data.session?.user?.name}
					<span class="text-stone-light">·</span>
					<span>{data.session.user.name}</span>
				{/if}
			</nav>
		</header>
		<main class="px-8 pb-16 max-w-2xl mx-auto">
			{@render children()}
		</main>
	</div>
{:else}
	{@render children()}
{/if}
