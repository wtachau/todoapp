<script lang="ts">
	import { signIn } from '@auth/sveltekit/client';
</script>

<svelte:head>
	<title>Tasks | Sign in</title>
</svelte:head>

<div class="min-h-screen bg-linen flex flex-col items-center justify-center gap-6">
	<div class="font-serif italic text-sage text-3xl">shared tasks</div>
	<button
		onclick={() => signIn('google', { redirectTo: '/' })}
		class="px-6 py-2.5 bg-sage text-white text-sm rounded-md hover:bg-sage/90 cursor-pointer tracking-wide"
	>
		Sign in with Google
	</button>
</div>
