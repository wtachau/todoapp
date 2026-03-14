<script lang="ts">
	import { signOut } from '@auth/sveltekit/client';

	let { data } = $props();
</script>

<main style="padding:2rem">
	<div style="display:flex;justify-content:space-between;align-items:center">
		<h1>Dashboard</h1>
		<button onclick={() => signOut({ redirectTo: '/' })}>Sign out</button>
	</div>
	<p>Signed in as {data.user?.name} ({data.user?.email})</p>
</main>
