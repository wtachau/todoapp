<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/stores";
  import { toast } from "$lib/toast.svelte.ts";

  let { data } = $props();
  let snoozing = $state<string | null>(null);
  let completing = $state<string | null>(null);
  let collapsing = $state<string | null>(null);
  let hiddenTasks = $state<string[]>([]);

  function ageColor(createdAt: Date | string): string {
    const ageMs = Date.now() - new Date(createdAt).getTime();
    const urgencyMs = data.urgencyDays * 24 * 60 * 60 * 1000;
    const ratio = Math.min(ageMs / urgencyMs, 1);
    // green (hue 120) → amber (hue 40) → red (hue 0)
    const hue =
      ratio < 0.5 ? 120 - ratio * 2 * 80 : 40 - (ratio - 0.5) * 2 * 40;
    const saturation = 45 + ratio * 25;
    const lightness = 42 - ratio * 10;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  function taskAge(createdAt: Date | string): string {
    const ms = Date.now() - new Date(createdAt).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return mins <= 1 ? "just now" : `${mins} minutes ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return days === 1 ? "1 day ago" : `${days} days ago`;
  }

  const filteredProject = $derived(
    data.projectFilter
      ? data.allProjects.find((p) => p.id === data.projectFilter)
      : null,
  );

  function snoozeEnhance() {
    return ({ formData }: { formData: FormData }) => {
      const preset = formData.get("preset") as string | null;
      const customDate = formData.get("customDate") as string | null;
      let msg = "Snoozed";
      if (preset === "tomorrow") msg = "Snoozed until tomorrow";
      else if (preset === "3days") msg = "Snoozed for 3 days";
      else if (preset === "1week") msg = "Snoozed for a week";
      else if (customDate) {
        const [y, m, d] = customDate.split("-").map(Number);
        const date = new Date(y, m - 1, d);
        msg = `Snoozed until ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
      }
      return async ({ update }: { update: () => Promise<void> }) => {
        snoozing = null;
        await update();
        toast(msg);
      };
    };
  }

  function filterUrl(params: Record<string, string | null>) {
    const u = new URL($page.url);
    for (const [k, v] of Object.entries(params)) {
      if (v === null) u.searchParams.delete(k);
      else u.searchParams.set(k, v);
    }
    return u.pathname + u.search;
  }
</script>

<svelte:head>
  <title>Tasks | Dashboard</title>
</svelte:head>

<!-- Filter chips -->
{#if data.allProjects.length > 1}
  <div class="flex gap-2 flex-wrap mt-2 mb-4">
    <a
      href={filterUrl({ project: null })}
      class="text-[10px] font-bold tracking-[0.07em] uppercase px-2.5 py-1 rounded-full transition-colors cursor-pointer"
      class:bg-sage={!data.projectFilter}
      class:text-white={!data.projectFilter}
      class:bg-stone-lighter={!!data.projectFilter}
      class:text-stone={!!data.projectFilter}>All</a
    >
    {#each data.allProjects as project}
      <a
        href={filterUrl({ project: project.id })}
        class="text-[10px] font-bold tracking-[0.07em] uppercase px-2.5 py-1 rounded-full transition-colors cursor-pointer"
        class:bg-sage={data.projectFilter === project.id}
        class:text-white={data.projectFilter === project.id}
        class:bg-stone-lighter={data.projectFilter !== project.id}
        class:text-stone={data.projectFilter !== project.id}>{project.name}</a
      >
    {/each}
  </div>
{/if}

<!-- Quick add -->
<form
  method="POST"
  action="?/createTask"
  use:enhance={() =>
    async ({ update }) => {
      await update({ reset: true });
      toast("Task added");
    }}
  class="flex flex-col sm:flex-row gap-2 mb-6"
>
  <input
    name="title"
    placeholder="Add a task…"
    required
    class="flex-1 border border-stone-light rounded-md px-3 py-2 text-sm bg-card focus:border-sage focus:outline-none"
  />
  <div class="flex gap-2">
    <select
      name="projectId"
      class="border border-stone-light rounded-md px-2 py-2 text-sm bg-card focus:border-sage focus:outline-none w-20 sm:w-auto"
    >
      {#each data.accessibleProjects as project}
        <option
          value={project.id}
          selected={project.id === data.defaultProjectId}>{project.name}</option
        >
      {/each}
    </select>
    <button
      type="submit"
      class="flex-1 sm:flex-none px-4 py-2 bg-sage text-white text-sm rounded-md hover:bg-sage/90 cursor-pointer"
      >Add</button
    >
  </div>
</form>

<!-- Active tasks -->
<div class="flex justify-between items-baseline mb-2 mt-2">
  <h2
    class="text-[10px] font-bold tracking-[0.14em] uppercase text-stone-muted"
  >
    {#if filteredProject}
      {filteredProject.name}
    {:else}
      My Tasks
    {/if}
  </h2>
</div>

{#if data.activeTasks.length === 0}
  <div class="flex flex-col items-center py-10 gap-3 text-center">
    <svg
      viewBox="0 0 200 120"
      class="w-56 h-auto"
      xmlns="http://www.w3.org/2000/svg"
    >
      <!-- Sky -->
      <rect width="200" height="120" fill="#f0ece4" />
      <!-- Sun -->
      <circle cx="100" cy="28" r="12" fill="#e8c84a" opacity="0.9" />
      <!-- Sun rays -->
      <line
        x1="100"
        y1="10"
        x2="100"
        y2="5"
        stroke="#e8c84a"
        stroke-width="2"
        stroke-linecap="round"
        opacity="0.8"
      />
      <line
        x1="114"
        y1="14"
        x2="118"
        y2="10"
        stroke="#e8c84a"
        stroke-width="2"
        stroke-linecap="round"
        opacity="0.8"
      />
      <line
        x1="118"
        y1="28"
        x2="124"
        y2="28"
        stroke="#e8c84a"
        stroke-width="2"
        stroke-linecap="round"
        opacity="0.8"
      />
      <line
        x1="114"
        y1="42"
        x2="118"
        y2="46"
        stroke="#e8c84a"
        stroke-width="2"
        stroke-linecap="round"
        opacity="0.8"
      />
      <line
        x1="100"
        y1="46"
        x2="100"
        y2="51"
        stroke="#e8c84a"
        stroke-width="2"
        stroke-linecap="round"
        opacity="0.8"
      />
      <line
        x1="86"
        y1="42"
        x2="82"
        y2="46"
        stroke="#e8c84a"
        stroke-width="2"
        stroke-linecap="round"
        opacity="0.8"
      />
      <line
        x1="82"
        y1="28"
        x2="76"
        y2="28"
        stroke="#e8c84a"
        stroke-width="2"
        stroke-linecap="round"
        opacity="0.8"
      />
      <line
        x1="86"
        y1="14"
        x2="82"
        y2="10"
        stroke="#e8c84a"
        stroke-width="2"
        stroke-linecap="round"
        opacity="0.8"
      />
      <!-- Ground -->
      <ellipse cx="100" cy="115" rx="90" ry="12" fill="#7a9e6e" opacity="0.3" />
      <!-- Tree 1 (left, tall) -->
      <rect x="42" y="70" width="6" height="40" fill="#8a6a40" />
      <polygon points="45,20 25,72 65,72" fill="#3a5040" />
      <polygon points="45,35 28,72 62,72" fill="#4a6a50" />
      <polygon points="45,50 30,72 60,72" fill="#5a7a5e" />
      <!-- Tree 2 (right, medium) -->
      <rect x="138" y="78" width="5" height="32" fill="#8a6a40" />
      <polygon points="140,32 122,80 158,80" fill="#3a5040" />
      <polygon points="140,46 125,80 155,80" fill="#4a6a50" />
      <polygon points="140,60 127,80 153,80" fill="#5a7a5e" />
      <!-- Tree 3 (far left, small) -->
      <rect x="18" y="84" width="4" height="26" fill="#8a6a40" />
      <polygon points="20,52 6,86 34,86" fill="#4a6a50" />
      <polygon points="20,65 8,86 32,86" fill="#5a7a5e" />
      <!-- Tree 4 (far right, small) -->
      <rect x="170" y="86" width="4" height="24" fill="#8a6a40" />
      <polygon points="172,56 158,88 186,88" fill="#4a6a50" />
      <polygon points="172,68 160,88 184,88" fill="#5a7a5e" />
      <!-- Light beams -->
      <line
        x1="100"
        y1="40"
        x2="60"
        y2="110"
        stroke="#e8c84a"
        stroke-width="8"
        opacity="0.07"
      />
      <line
        x1="100"
        y1="40"
        x2="100"
        y2="110"
        stroke="#e8c84a"
        stroke-width="6"
        opacity="0.07"
      />
      <line
        x1="100"
        y1="40"
        x2="140"
        y2="110"
        stroke="#e8c84a"
        stroke-width="8"
        opacity="0.07"
      />
    </svg>
    <div class="text-base font-semibold text-ink">All clear</div>
    <div class="text-sm text-stone">Nothing left on your plate. Enjoy it.</div>
  </div>
{:else}
  <div class="flex flex-col gap-1.5 mb-4">
    {#each data.activeTasks.filter((t) => !hiddenTasks.includes(t.id)) as task (task.id)}
      <div
        class="transition-all duration-250 ease-out overflow-hidden"
        style={collapsing === task.id
          ? "opacity: 0; max-height: 0; margin: 0"
          : "opacity: 1; max-height: 600px"}
      >
        {@render taskCard(task)}
      </div>
    {/each}
  </div>
{/if}

<div class="flex gap-4 text-xs mb-8">
  <a
    href={filterUrl({ showDone: data.showDone ? null : "true" })}
    class="text-stone hover:text-sage transition-colors"
  >
    {data.showDone ? "hide completed ↑" : "show completed ↓"}
  </a>
  <a
    href="/dashboard/snoozed"
    class="text-stone hover:text-sage transition-colors">snoozed</a
  >
  {#each data.partners as partner}
    <a
      href="/dashboard/users/{partner.id}"
      class="text-stone hover:text-sage transition-colors"
    >
      {partner.name ?? partner.email}'s tasks
    </a>
  {/each}
</div>

<!-- Completed tasks -->
{#if data.showDone && data.doneTasks.length > 0}
  <div
    class="text-[10px] font-bold tracking-[0.14em] uppercase text-stone-muted mb-2"
  >
    Completed
  </div>
  <div class="flex flex-col gap-1.5 mb-8 opacity-60">
    {#each data.doneTasks as task}
      {@render taskCard(task)}
    {/each}
  </div>
{/if}

<!-- Partner section -->
{#each data.partners as partner}
  <div class="bg-sage-light border border-[#c8d0c4] rounded-lg px-5 py-4 mb-6">
    <div
      class="text-[10px] font-bold tracking-[0.12em] uppercase text-sage mb-2"
    >
      {partner.name ?? partner.email}'s tasks · shared projects
    </div>
    <a
      href="/dashboard/users/{partner.id}"
      class="text-xs text-sage-muted hover:text-sage transition-colors"
    >
      View all →
    </a>
  </div>
{/each}

{#snippet taskCard(task: (typeof data.activeTasks)[0])}
  <div
    class="bg-card border border-stone-light rounded-md px-3.5 py-2.5 grid grid-cols-[28px_1fr_auto_auto] gap-2 items-center hover:border-stone transition-colors"
  >
    <form
      method="POST"
      action="?/updateStatus"
      use:enhance={() => {
        const isCompleting = task.status !== "done";
        if (isCompleting) completing = task.id;
        return async ({ update }) => {
          if (isCompleting) {
            await new Promise((r) => setTimeout(r, 250));
            collapsing = task.id;
            await new Promise((r) => setTimeout(r, 250));
            if (task.generator?.nextRunAt) {
              const next = new Date(task.generator.nextRunAt);
              toast(
                `Done · repeats ${next.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`,
              );
            }
            hiddenTasks = [...hiddenTasks, task.id];
          }
          await update();
        };
      }}
      style="display: contents"
    >
      <input type="hidden" name="taskId" value={task.id} />
      <input
        type="hidden"
        name="status"
        value={task.status === "done" ? "todo" : "done"}
      />
      <button
        type="submit"
        onmousedown={() => {
          if (task.status !== "done") completing = task.id;
        }}
        class="w-5 h-5 rounded border flex items-center justify-center text-xs cursor-pointer hover:border-sage shrink-0"
        class:bg-sage={task.status === "done" || completing === task.id}
        class:border-sage={task.status === "done" || completing === task.id}
        class:text-white={task.status === "done" || completing === task.id}
        class:border-stone-light={task.status !== "done" &&
          completing !== task.id}
      >
        {#if task.status === "done" || completing === task.id}✓{/if}
      </button>
    </form>

    <div>
      <div
        class="text-sm"
        class:line-through={task.status === "done"}
        class:text-stone={task.status === "done"}
      >
        {task.title}
      </div>
      <div class="flex gap-1 mt-1 flex-wrap">
        {#if task.generatorId}
          <span
            class="text-[10px] font-bold tracking-[0.07em] uppercase px-2 py-0.5 rounded-full bg-[#f0e8d8] text-[#8a5020]"
            >↺ recurring</span
          >
        {/if}
        {#if task.project.team.members.length > 1}
          <span
            class="text-[10px] font-bold tracking-[0.07em] uppercase px-2 py-0.5 rounded-full bg-sage-light text-sage"
            >shared</span
          >
        {/if}
        <span
          class="text-[10px] font-bold tracking-[0.07em] uppercase px-2 py-0.5 rounded-full bg-stone-lighter text-stone"
          >{task.project.name}</span
        >
      </div>
    </div>

    <div class="relative group shrink-0 flex items-center justify-center">
      <div
        class="w-2.5 h-2.5 rounded-full cursor-default"
        style="background-color: {ageColor(task.createdAt)}"
      ></div>
      <div
        class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block whitespace-nowrap text-xs bg-ink text-white px-2 py-1 rounded pointer-events-none z-10"
      >
        Created {taskAge(task.createdAt)}
      </div>
    </div>

    {#if task.status !== "done"}
      <button
        type="button"
        onclick={() => (snoozing = snoozing === task.id ? null : task.id)}
        class="text-[11px] tracking-wide border border-stone-light rounded px-2.5 py-1 text-stone hover:border-sage hover:text-sage transition-colors cursor-pointer whitespace-nowrap"
      >
        {snoozing === task.id ? "cancel" : "snooze"}
      </button>
    {:else}
      <div></div>
    {/if}
  </div>

  {#if snoozing === task.id}
    <div class="flex flex-col gap-2 px-1 text-xs mt-2 mb-2">
      <div class="flex gap-2">
        {#each [["tomorrow", "Tomorrow"], ["3days", "In 3 days"], ["1week", "1 week"]] as [preset, label]}
          <form
            method="POST"
            action="?/snooze"
            use:enhance={snoozeEnhance()}
            class="flex-1"
          >
            <input type="hidden" name="taskId" value={task.id} />
            <input type="hidden" name="preset" value={preset} />
            <button
              type="submit"
              class="w-full py-2 bg-stone-light hover:bg-stone/40 rounded cursor-pointer transition-colors"
            >
              {label}
            </button>
          </form>
        {/each}
      </div>
      <form
        method="POST"
        action="?/snooze"
        use:enhance={snoozeEnhance()}
        class="flex gap-2"
      >
        <input type="hidden" name="taskId" value={task.id} />
        <input
          type="date"
          name="customDate"
          required
          class="flex-1 border border-stone-light rounded px-2 py-2 bg-white"
        />
        <button
          type="submit"
          class="px-3 py-2 bg-stone-light hover:bg-stone/40 rounded cursor-pointer transition-colors whitespace-nowrap"
        >
          Snooze until →
        </button>
      </form>
    </div>
  {/if}
{/snippet}
