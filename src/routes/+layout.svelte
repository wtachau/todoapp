<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";
  import { invalidateAll } from "$app/navigation";
  import Toast from "$lib/components/Toast.svelte";
  let { data, children } = $props();
  const isAuthed = $derived(!!data.session?.user);

  // Refresh page data when the user returns to a stale tab, and poll every 60s
  // while the tab is visible. Avoids stale state across multiple devices/tabs.
  const POLL_MS = 60_000;
  onMount(() => {
    if (!isAuthed) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      timer = setInterval(() => invalidateAll(), POLL_MS);
    };
    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        invalidateAll();
        start();
      } else {
        stop();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    start();
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  });
</script>

<svelte:head>
  <title>Tasks</title>
</svelte:head>

<Toast />

{#if isAuthed}
  <div class="min-h-screen bg-linen">
    <header class="flex justify-between items-center px-4 sm:px-8 py-5">
      <a href="/" class="font-serif italic text-sage text-xl no-underline"
        >shared tasks</a
      >
      <nav class="flex gap-5 text-xs tracking-wide text-stone">
        <a href="/projects" class="hover:text-sage transition-colors"
          >projects</a
        >
        <a href="/snoozed" class="hover:text-sage transition-colors">snoozed</a>
        <a href="/settings" class="hover:text-sage transition-colors"
          >settings</a
        >
        {#if data.session?.user?.name}
          <span class="text-stone-light hidden sm:inline">·</span>
          <span class="hidden sm:inline">{data.session.user.name}</span>
        {/if}
      </nav>
    </header>
    <main class="px-4 sm:px-8 pb-16 max-w-2xl mx-auto">
      {@render children()}
    </main>
  </div>
{:else}
  {@render children()}
{/if}
