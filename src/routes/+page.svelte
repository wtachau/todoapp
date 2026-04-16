<script lang="ts">
  import { enhance } from "$app/forms";
  import { TaskStatus } from "@prisma/client";
  import { page } from "$app/stores";
  import { toast } from "$lib/toast.svelte";
  import {
    ageColor as _ageColor,
    taskAge,
    formatNextRun,
  } from "$lib/taskUtils";
  import AgeDot from "$lib/components/AgeDot.svelte";
  import GeneratorFormFields from "$lib/components/GeneratorFormFields.svelte";
  let { data } = $props();
  let snoozing = $state<string | null>(null);
  let scheduling = $state(false);
  let scheduledDate = $state("");
  let dropdownOpen = $state(false);
  let completing = $state<string | null>(null);
  let collapsing = $state<string | null>(null);
  let hiddenTasks = $state<string[]>([]);
  let pendingCount = $state(0);
  let optimisticTasks = $state<typeof data.activeTasks>([]);

  // Recurring (task generator) mode state for the quick-add form
  let recurring = $state(false);
  // svelte-ignore state_referenced_locally
  let selectedProjectId = $state<string>(data.defaultProjectId ?? "");
  let genDays = $state<string[]>([]);
  let genAdvanced = $state(false);
  let genRrule = $state("");
  let genRruleError = $state<string | null>(null);
  let genMode = $state<"fixed" | "round_robin">("round_robin");
  let genFixedAssigneeId = $state<string>("");
  let genStartsWithId = $state<string>("");

  // Members of the currently-selected project (for assignee dropdowns)
  const selectedProjectMembers = $derived(
    data.teams.find((t) => t.projects.some((p) => p.id === selectedProjectId))
      ?.members ?? [],
  );

  const ageColor = (createdAt: Date | string) =>
    _ageColor(createdAt, data.urgencyDays);

  let activeFilter = $state<string | null>(null);
  const filteredActiveTasks = $derived(
    [...optimisticTasks, ...data.activeTasks].filter((t) =>
      activeFilter ? t.projectId === activeFilter : true,
    ),
  );
  const filteredTodoTasks = $derived(
    filteredActiveTasks.filter((t) => t.status !== TaskStatus.in_progress),
  );
  const filteredInProgressTasks = $derived(
    filteredActiveTasks.filter((t) => t.status === TaskStatus.in_progress),
  );
  const filteredDoneTasks = $derived(
    activeFilter
      ? data.doneTasks.filter((t) => t.projectId === activeFilter)
      : data.doneTasks,
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
        optimisticTasks = [];
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

<!-- Quick add -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<form
  method="POST"
  action={recurring ? "?/createGenerator" : "?/createTask"}
  use:enhance={({ formData, formElement }) => {
    // Generator path: no optimistic UI (they don't appear in the dashboard list),
    // just submit and reset on success.
    if (recurring) {
      pendingCount++;
      return async ({ result, update }) => {
        pendingCount--;
        if (result.type === "success") {
          formElement.reset();
          recurring = false;
          genDays = [];
          genAdvanced = false;
          genRrule = "";
          genMode = "round_robin";
          genFixedAssigneeId = "";
          genStartsWithId = "";
          await update();
          toast("Recurring task added");
        }
      };
    }

    const wasScheduling = scheduling;

    // Optimistically add the task to the list immediately, before the server responds.
    // We build a minimal stub that satisfies the shape taskCard expects.
    const title = formData.get("title") as string;
    const projectId = formData.get("projectId") as string;
    const project = data.accessibleProjects.find((p) => p.id === projectId);
    const tempId = `temp-${Date.now()}`;
    optimisticTasks = [
      {
        id: tempId,
        title,
        status: TaskStatus.todo,
        projectId,
        project: {
          id: projectId,
          name: project?.name ?? "",
          team: { members: [] as any[] },
        },
        generator: null,
        generatorId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        assignedTo: "",
        snoozedUntil: null,
      } as any,
      ...optimisticTasks,
    ];

    // Clear the form and reset scheduling state right away — don't wait for the server.
    formElement.reset();
    scheduling = false;
    scheduledDate = "";
    pendingCount++;

    return async ({ result }) => {
      pendingCount--;
      if (result.type === "success" && result.data?.task) {
        // Swap the stub for the real task in one render — no flash.
        optimisticTasks = optimisticTasks.map((t) =>
          t.id === tempId ? (result.data as any).task : t,
        );
      } else {
        optimisticTasks = optimisticTasks.filter((t) => t.id !== tempId);
      }
      toast(wasScheduling ? "Task scheduled" : "Task added");
    };
  }}
  class="mb-6"
>
  <!-- Project selector -->
  <div class="mb-2 flex justify-end">
    <div class="relative">
      <select
        name="projectId"
        bind:value={selectedProjectId}
        class="text-xs text-ink bg-card border border-stone rounded-full pl-3 pr-6 py-1 focus:outline-none cursor-pointer hover:border-ink transition-colors appearance-none"
      >
        {#each data.accessibleProjects as project}
          <option value={project.id}>{project.name}</option>
        {/each}
      </select>
      <span
        class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink text-[10px]"
        >▾</span
      >
    </div>
  </div>

  <div class="relative">
    <div
      class="flex items-stretch border border-stone-light rounded-md bg-card focus-within:border-sage transition-colors overflow-hidden"
    >
      <!-- Text input -->
      <input
        name="title"
        placeholder="Add a task…"
        required
        class="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none min-w-0"
      />

      <!-- Date button (schedule mode) -->
      {#if scheduling}
        <input
          type="date"
          name="scheduledFor"
          bind:value={scheduledDate}
          required
          min={new Date().toISOString().split("T")[0]}
          class="w-32 px-2 py-2.5 text-sm bg-transparent border-l border-stone-light focus:outline-none cursor-pointer"
          class:text-sage={scheduledDate}
          class:text-stone-light={!scheduledDate}
        />
      {/if}

      <!-- Split button: Add + dropdown chevron -->
      <div class="flex items-stretch border-l border-stone-light">
        <button
          type="submit"
          disabled={recurring && genAdvanced && !!genRruleError}
          class="px-4 text-sm text-sage font-medium hover:bg-sage-light cursor-pointer transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
          >{recurring
            ? "Add recurring"
            : scheduling
              ? "Schedule"
              : "Add"}</button
        >
        <button
          type="button"
          onclick={() => (dropdownOpen = !dropdownOpen)}
          class="border-l border-stone-light px-2 text-stone hover:bg-sage-light cursor-pointer transition-colors text-xs"
          >▾</button
        >
      </div>
    </div>

    <!-- Dropdown (outside overflow-hidden) -->
    {#if dropdownOpen}
      <div
        class="fixed inset-0 z-10"
        onclick={() => (dropdownOpen = false)}
      ></div>
      <div
        class="absolute right-0 top-full mt-1 bg-card border border-stone-light rounded-md shadow-md z-20 w-36 py-1"
      >
        <button
          type="button"
          onclick={() => {
            scheduling = !scheduling;
            if (scheduling) recurring = false;
            if (!scheduling) scheduledDate = "";
            dropdownOpen = false;
          }}
          class="w-full text-left px-3 py-2 text-sm text-ink hover:bg-sage-light cursor-pointer transition-colors"
          >{scheduling ? "Add" : "Schedule"}</button
        >
        <button
          type="button"
          onclick={() => {
            recurring = !recurring;
            if (recurring) {
              scheduling = false;
              scheduledDate = "";
            }
            dropdownOpen = false;
          }}
          class="w-full text-left px-3 py-2 text-sm text-ink hover:bg-sage-light cursor-pointer transition-colors"
          >{recurring ? "Add" : "Recurring"}</button
        >
      </div>
    {/if}
  </div>

  <!-- Recurring (generator) fields — shown below the input when recurring mode is active -->
  {#if recurring}
    <div
      class="mt-3 flex flex-col gap-3 p-3 bg-card border border-stone-light rounded-md"
    >
      <GeneratorFormFields
        members={selectedProjectMembers}
        bind:days={genDays}
        bind:advanced={genAdvanced}
        bind:rrule={genRrule}
        bind:rruleError={genRruleError}
        bind:mode={genMode}
        bind:fixedAssigneeId={genFixedAssigneeId}
        bind:startsWithId={genStartsWithId}
      />
    </div>
  {/if}
</form>

<!-- In Progress -->
{#if filteredInProgressTasks.length > 0}
  <div class="flex justify-between items-baseline mb-2 mt-2">
    <h2
      class="text-[10px] font-bold tracking-[0.14em] uppercase text-stone-muted"
    >
      In Progress
    </h2>
    {#if data.allProjects.length > 1}
      <div class="flex gap-1.5 flex-wrap">
        <button
          type="button"
          onclick={() => (activeFilter = null)}
          class="text-[10px] font-bold tracking-[0.07em] uppercase px-2.5 py-1 rounded-full transition-colors cursor-pointer"
          class:bg-sage={!activeFilter}
          class:text-white={!activeFilter}
          class:bg-stone-lighter={!!activeFilter}
          class:text-stone={!!activeFilter}>All</button
        >
        {#each data.allProjects as project}
          <button
            type="button"
            onclick={() => (activeFilter = project.id)}
            class="text-[10px] font-bold tracking-[0.07em] uppercase px-2.5 py-1 rounded-full transition-colors cursor-pointer"
            class:bg-sage={activeFilter === project.id}
            class:text-white={activeFilter === project.id}
            class:bg-stone-lighter={activeFilter !== project.id}
            class:text-stone={activeFilter !== project.id}
            >{project.name}</button
          >
        {/each}
      </div>
    {/if}
  </div>
  <div class="flex flex-col gap-1.5 mb-4">
    {#each filteredInProgressTasks.filter((t) => !hiddenTasks.includes(t.id)) as task (task.id)}
      <div
        class="transition-all duration-250 ease-out"
        style={collapsing === task.id
          ? "opacity: 0; max-height: 0; margin: 0"
          : "opacity: 1; max-height: 600px"}
      >
        {@render taskCard(task)}
      </div>
    {/each}
  </div>
  {#if filteredTodoTasks.length > 0}
    <div class="flex justify-between items-baseline mb-2">
      <h2
        class="text-[10px] font-bold tracking-[0.14em] uppercase text-stone-muted"
      >
        To Do
      </h2>
    </div>
  {/if}
{:else}
  <div class="flex justify-between items-baseline mb-2 mt-2">
    <h2
      class="text-[10px] font-bold tracking-[0.14em] uppercase text-stone-muted"
    >
      To Do
    </h2>
    {#if data.allProjects.length > 1}
      <div class="flex gap-1.5 flex-wrap">
        <button
          type="button"
          onclick={() => (activeFilter = null)}
          class="text-[10px] font-bold tracking-[0.07em] uppercase px-2.5 py-1 rounded-full transition-colors cursor-pointer"
          class:bg-sage={!activeFilter}
          class:text-white={!activeFilter}
          class:bg-stone-lighter={!!activeFilter}
          class:text-stone={!!activeFilter}>All</button
        >
        {#each data.allProjects as project}
          <button
            type="button"
            onclick={() => (activeFilter = project.id)}
            class="text-[10px] font-bold tracking-[0.07em] uppercase px-2.5 py-1 rounded-full transition-colors cursor-pointer"
            class:bg-sage={activeFilter === project.id}
            class:text-white={activeFilter === project.id}
            class:bg-stone-lighter={activeFilter !== project.id}
            class:text-stone={activeFilter !== project.id}
            >{project.name}</button
          >
        {/each}
      </div>
    {/if}
  </div>
{/if}

{#if filteredTodoTasks.length === 0 && filteredInProgressTasks.length === 0}
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
{:else if filteredTodoTasks.length > 0}
  <div class="flex flex-col gap-1.5 mb-4">
    {#each filteredTodoTasks.filter((t) => !hiddenTasks.includes(t.id)) as task (task.id)}
      <div
        class="transition-all duration-250 ease-out"
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
  <a href="/snoozed" class="text-stone hover:text-sage transition-colors"
    >snoozed</a
  >
  {#if selectedProjectId}
    <a
      href="/projects/{selectedProjectId}"
      class="text-stone hover:text-sage transition-colors">recurring tasks →</a
    >
  {/if}
</div>

<!-- Completed tasks -->
{#if data.showDone && filteredDoneTasks.length > 0}
  <div
    class="text-[10px] font-bold tracking-[0.14em] uppercase text-stone-muted mb-2"
  >
    Completed
  </div>
  <div class="flex flex-col gap-1.5 mb-8 opacity-60">
    {#each filteredDoneTasks as task}
      {@render taskCard(task)}
    {/each}
  </div>
{/if}

<!-- Partner cards -->
{#each data.partners as partner}
  <a
    href="/users/{partner.id}"
    class="block bg-sage-light border border-[#c8d0c4] rounded-lg px-5 py-4 mb-6 hover:border-sage transition-colors"
  >
    <div class="text-sm font-medium text-sage">
      {partner.name ?? partner.email}'s tasks
    </div>
    <div class="text-xs text-sage-muted mt-0.5">Shared projects →</div>
  </a>
{/each}

{#snippet taskCard(task: (typeof filteredActiveTasks)[0])}
  <div
    class="bg-card border border-stone-light rounded-md px-3.5 py-2.5 grid grid-cols-[28px_1fr_auto_auto_auto] gap-2 items-center hover:border-stone transition-colors"
  >
    <form
      method="POST"
      action="?/updateStatus"
      use:enhance={() => {
        const isCompleting = task.status !== TaskStatus.done;
        if (isCompleting) {
          completing = task.id;
          pendingCount++;
          setTimeout(async () => {
            collapsing = task.id;
            await new Promise((r) => setTimeout(r, 250));
            if (task.generator?.nextRunAt) {
              const next = new Date(task.generator.nextRunAt);
              toast(`Done · repeats ${formatNextRun(next)}`);
            }
            hiddenTasks = [...hiddenTasks, task.id];
          }, 250);
        }
        return async ({ update }) => {
          if (isCompleting) pendingCount--;
          else {
            await update();
            optimisticTasks = [];
          }
        };
      }}
      style="display: contents"
    >
      <input type="hidden" name="taskId" value={task.id} />
      <input
        type="hidden"
        name="status"
        value={task.status === TaskStatus.done
          ? TaskStatus.todo
          : TaskStatus.done}
      />
      <button
        type="submit"
        onmousedown={() => {
          if (task.status !== TaskStatus.done) completing = task.id;
        }}
        class="w-5 h-5 rounded border flex items-center justify-center text-xs cursor-pointer hover:border-sage shrink-0"
        class:bg-sage={task.status === TaskStatus.done ||
          completing === task.id}
        class:border-sage={task.status === TaskStatus.done ||
          completing === task.id}
        class:text-white={task.status === TaskStatus.done ||
          completing === task.id}
        class:border-stone-light={task.status !== TaskStatus.done &&
          completing !== task.id}
      >
        {#if task.status === TaskStatus.done || completing === task.id}✓{/if}
      </button>
    </form>

    <div>
      <div
        class="text-sm"
        class:line-through={task.status === TaskStatus.done}
        class:text-stone={task.status === TaskStatus.done}
      >
        {task.title}
      </div>
      <div class="flex gap-1 mt-1 flex-wrap items-center">
        <span class="text-xs text-stone"
          >{new Date(task.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}</span
        >
        <span class="text-xs text-stone">·</span>
        {#if task.generatorId}
          <span
            class="text-xs px-1.5 py-0.5 rounded-full bg-[#f0e8d8] text-[#8a5020]"
            title="Recurring"><i class="fa-solid fa-rotate"></i></span
          >
        {/if}
        <span
          class="text-[10px] font-bold tracking-[0.07em] uppercase px-2 py-0.5 rounded-full bg-sage-light text-sage"
          >{task.project.name}</span
        >
      </div>
    </div>

    <AgeDot createdAt={task.createdAt} color={ageColor(task.createdAt)} />

    {#if task.status !== TaskStatus.done}
      <form method="POST" action="?/updateStatus" use:enhance>
        <input type="hidden" name="taskId" value={task.id} />
        <input
          type="hidden"
          name="status"
          value={task.status === TaskStatus.in_progress
            ? TaskStatus.todo
            : TaskStatus.in_progress}
        />
        <button
          type="submit"
          title={task.status === TaskStatus.in_progress
            ? "Mark as to do"
            : "Mark as in progress"}
          class="border rounded-lg p-1 w-9 h-9 flex items-center justify-center cursor-pointer transition-colors"
          class:border-blue-300={task.status === TaskStatus.in_progress}
          class:text-blue-500={task.status === TaskStatus.in_progress}
          class:bg-blue-50={task.status === TaskStatus.in_progress}
          class:border-stone-light={task.status !== TaskStatus.in_progress}
          class:text-stone={task.status !== TaskStatus.in_progress}
          class:hover:border-blue-300={task.status !== TaskStatus.in_progress}
          class:hover:text-blue-500={task.status !== TaskStatus.in_progress}
          ><i class="fa-regular fa-circle-play"></i></button
        >
      </form>
      <button
        type="button"
        onclick={() => (snoozing = snoozing === task.id ? null : task.id)}
        title={snoozing === task.id ? "Cancel" : "Snooze"}
        class="border rounded-lg p-1 w-9 h-9 flex items-center justify-center cursor-pointer transition-colors"
        class:border-sage={snoozing === task.id}
        class:text-sage={snoozing === task.id}
        class:border-stone-light={snoozing !== task.id}
        class:text-stone={snoozing !== task.id}
        class:hover:border-sage={snoozing !== task.id}
        class:hover:text-sage={snoozing !== task.id}
      >
        <i class="fa-regular fa-clock"></i>
      </button>
    {:else}
      <div></div>
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

{#if pendingCount > 0}
  <div
    class="fixed bottom-4 left-4 flex items-center gap-2 text-xs text-stone bg-card border border-stone-light rounded-md px-3 py-1.5 shadow-sm"
  >
    <span class="inline-block w-2 h-2 rounded-full bg-sage animate-pulse"
    ></span>
    Saving…
  </div>
{/if}
