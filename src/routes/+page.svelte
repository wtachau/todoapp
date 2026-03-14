<script lang="ts">
	let { data } = $props();
</script>

<main>
	{#if data.session?.user}
		<p><a href="/dashboard">Go to dashboard →</a></p>
	{:else}
		<h1>Welcome</h1>
		<p><a href="/sign-in">Sign in</a> to get started.</p>
	{/if}
</main>
