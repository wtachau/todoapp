<script lang="ts">
	import { onMount } from 'svelte';

	type Member = { userId: string; user: { name: string | null; email: string | null } };

	let {
		members = [] as Member[],
		days = $bindable<string[]>([]),
		advanced = $bindable(false),
		rrule = $bindable(''),
		rruleError = $bindable<string | null>(null),
		mode = $bindable<'fixed' | 'round_robin'>('round_robin'),
		fixedAssigneeId = $bindable(''),
		startsWithId = $bindable('')
	}: {
		members: Member[];
		days?: string[];
		advanced?: boolean;
		rrule?: string;
		rruleError?: string | null;
		mode?: 'fixed' | 'round_robin';
		fixedAssigneeId?: string;
		startsWithId?: string;
	} = $props();

	const DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
	const DAY_LABELS: Record<string, string> = {
		MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun'
	};

	// Lazy-load rrule on the client only; keeps SSR unaffected.
	let rruleFromString: ((s: string) => void) | null = null;
	onMount(async () => {
		const { RRule } = await import('rrule');
		rruleFromString = (s) => RRule.fromString(s);
	});

	function validateRrule(value: string): string | null {
		if (!value || !rruleFromString) return null;
		try {
			rruleFromString(value);
			return null;
		} catch (e) {
			return e instanceof Error ? e.message : 'Invalid RRULE string';
		}
	}

	// Round-robin is meaningless with a single member — force fixed mode in that case.
	$effect(() => {
		if (members.length <= 1) {
			mode = 'fixed';
			fixedAssigneeId = members[0]?.userId ?? '';
		}
	});
</script>

<input type="hidden" name="advanced" value={advanced ? 'true' : 'false'} />

{#if advanced}
	<input
		name="rrule"
		placeholder="FREQ=DAILY;INTERVAL=2"
		required
		bind:value={rrule}
		oninput={(e) => {
			const el = e.currentTarget as HTMLInputElement;
			const pos = el.selectionStart;
			el.value = el.value.toUpperCase();
			el.setSelectionRange(pos, pos);
			rrule = el.value;
			rruleError = validateRrule(el.value);
		}}
		class="border rounded px-3 py-1.5 text-sm font-mono bg-linen focus:outline-none {rruleError
			? 'border-red-400 focus:border-red-400'
			: 'border-stone-light focus:border-sage'}"
	/>
	{#if rruleError}
		<p class="text-xs text-red-500 bg-red-50 border border-red-200 rounded px-2 py-1">{rruleError}</p>
	{:else}
		<p class="text-xs text-stone">
			e.g. <code>FREQ=DAILY;INTERVAL=2</code> · <code>FREQ=WEEKLY;BYDAY=MO,WE,FR</code>
		</p>
	{/if}
{:else}
	<div class="flex gap-3 flex-wrap">
		{#each DAYS as day}
			<label class="flex items-center gap-1 text-sm cursor-pointer text-stone hover:text-ink">
				<input
					type="checkbox"
					name="days"
					value={day}
					checked={days.includes(day)}
					onchange={(e) => {
						const checked = (e.currentTarget as HTMLInputElement).checked;
						days = checked ? [...days, day] : days.filter((d) => d !== day);
					}}
					class="accent-sage"
				/>
				{DAY_LABELS[day]}
			</label>
		{/each}
	</div>
{/if}

<button
	type="button"
	onclick={() => (advanced = !advanced)}
	class="self-start text-xs text-stone hover:text-sage underline cursor-pointer"
>
	{advanced ? '← simple' : 'advanced (rrule)'}
</button>

{#if members.length > 1}
	<div class="flex gap-4">
		<label class="flex items-center gap-1.5 text-sm cursor-pointer">
			<input
				type="radio"
				name="assignmentMode"
				value="round_robin"
				checked={mode === 'round_robin'}
				onchange={() => (mode = 'round_robin')}
				class="accent-sage"
			/>
			<span class="text-stone">Round-robin</span>
		</label>
		<label class="flex items-center gap-1.5 text-sm cursor-pointer">
			<input
				type="radio"
				name="assignmentMode"
				value="fixed"
				checked={mode === 'fixed'}
				onchange={() => (mode = 'fixed')}
				class="accent-sage"
			/>
			<span class="text-stone">Fixed</span>
		</label>
	</div>
{:else}
	<input type="hidden" name="assignmentMode" value="fixed" />
{/if}

{#if mode === 'fixed'}
	<select
		name="fixedAssigneeId"
		bind:value={fixedAssigneeId}
		required
		class="border border-stone-light rounded px-3 py-1.5 text-sm bg-linen focus:border-sage focus:outline-none"
	>
		<option value="">Assign to…</option>
		{#each members as m}
			<option value={m.userId}>{m.user.name ?? m.user.email}</option>
		{/each}
	</select>
{:else if members.length > 1}
	<select
		name="startsWithId"
		bind:value={startsWithId}
		class="border border-stone-light rounded px-3 py-1.5 text-sm bg-linen focus:border-sage focus:outline-none"
	>
		<option value="">Starts with… (optional)</option>
		{#each members as m}
			<option value={m.userId}>{m.user.name ?? m.user.email}</option>
		{/each}
	</select>
{/if}
