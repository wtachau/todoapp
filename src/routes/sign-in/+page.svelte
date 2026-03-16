<script lang="ts">
	import { signIn } from '@auth/sveltekit/client';
</script>

<div class="flex justify-center items-center min-h-screen">
	<button
		onclick={() => signIn('google', { redirectTo: '/dashboard' })}
		class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
	>
		Sign in with Google
	</button>
</div>
