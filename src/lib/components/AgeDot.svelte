<script lang="ts">
  import { taskAge } from "$lib/taskUtils";

  let { createdAt, color }: { createdAt: Date | string; color: string } =
    $props();
</script>

<div class="relative group shrink-0 flex items-center justify-center">
  <div
    class="w-3 h-3 rounded-full cursor-default"
    style="background-color: {color}"
  ></div>
  <div
    class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block whitespace-nowrap text-xs bg-ink text-white px-2 py-1 rounded pointer-events-none z-10"
  >
    Created {taskAge(createdAt)}
  </div>
</div>
