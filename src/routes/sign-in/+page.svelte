<script lang="ts">
	import { signIn } from '@auth/sveltekit/client';
</script>

<div style="display:flex;justify-content:center;padding:4rem">
	<button onclick={() => signIn('google', { redirectTo: '/dashboard' })}>
		Sign in with Google
	</button>
</div>
