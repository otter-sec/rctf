<script lang="ts">
  import { IconCheck } from '$lib/icons'
  import { cn } from '$lib/utils'
  import {
    clearTimeRangeFilter,
    hasTimeRangeFilter,
    type SubmissionFilters,
  } from '../submissions-filters'

  interface Props {
    filters: SubmissionFilters
    timeRangeError?: string
  }

  let { filters = $bindable<SubmissionFilters>(), timeRangeError }: Props = $props()

  function setRelativeTimeRange(enabled: boolean) {
    filters.time.mode = enabled ? 'relative' : 'absolute'
  }
</script>

<div
  role="presentation"
  class="flex flex-col gap-3 p-3"
  onclick={event => event.stopPropagation()}
  onkeydown={event => event.stopPropagation()}
  onpointerdown={event => event.stopPropagation()}
>
  <label class="text-foreground-l2 flex cursor-pointer items-center gap-2 text-sm">
    <input
      type="checkbox"
      checked={filters.time.mode === 'relative'}
      class="sr-only"
      onchange={event => setRelativeTimeRange(event.currentTarget.checked)}
    />
    <span
      class={cn(
        'border-foreground-l4/60 flex size-4 items-center justify-center rounded-lg border-2',
        filters.time.mode === 'relative' &&
          'bg-foreground-l0 text-background-l0 border-foreground-l0'
      )}
    >
      {#if filters.time.mode === 'relative'}
        <IconCheck class="size-3" />
      {/if}
    </span>
    CTF-relative
  </label>
  {#if filters.time.mode === 'relative'}
    <label class="flex flex-col gap-1.5">
      <span class="text-foreground-l3 text-xs">From</span>
      <input
        type="text"
        value={filters.time.relativeStart}
        placeholder="2d 4h"
        aria-invalid={!!timeRangeError}
        class={cn(
          'bg-background-l2 text-foreground-l1 border-foreground-l4/40 h-9 rounded-md border px-2 text-sm outline-none',
          timeRangeError && 'border-foreground-destructive/70'
        )}
        oninput={event => (filters.time.relativeStart = event.currentTarget.value)}
      />
    </label>
    <label class="flex flex-col gap-1.5">
      <span class="text-foreground-l3 text-xs">To</span>
      <input
        type="text"
        value={filters.time.relativeEnd}
        placeholder="2d 6h"
        aria-invalid={!!timeRangeError}
        class={cn(
          'bg-background-l2 text-foreground-l1 border-foreground-l4/40 h-9 rounded-md border px-2 text-sm outline-none',
          timeRangeError && 'border-foreground-destructive/70'
        )}
        oninput={event => (filters.time.relativeEnd = event.currentTarget.value)}
      />
    </label>
  {:else}
    <label class="flex flex-col gap-1.5">
      <span class="text-foreground-l3 text-xs">From</span>
      <input
        type="datetime-local"
        value={filters.time.start}
        aria-invalid={!!timeRangeError}
        class={cn(
          'bg-background-l2 text-foreground-l1 border-foreground-l4/40 h-9 rounded-md border px-2 text-sm scheme-dark outline-none',
          timeRangeError && 'border-foreground-destructive/70'
        )}
        oninput={event => (filters.time.start = event.currentTarget.value)}
      />
    </label>
    <label class="flex flex-col gap-1.5">
      <span class="text-foreground-l3 text-xs">To</span>
      <input
        type="datetime-local"
        value={filters.time.end}
        aria-invalid={!!timeRangeError}
        class={cn(
          'bg-background-l2 text-foreground-l1 border-foreground-l4/40 h-9 rounded-md border px-2 text-sm scheme-dark outline-none',
          timeRangeError && 'border-foreground-destructive/70'
        )}
        oninput={event => (filters.time.end = event.currentTarget.value)}
      />
    </label>
  {/if}
  {#if timeRangeError}
    <p class="text-foreground-destructive text-xs">{timeRangeError}</p>
  {/if}
  {#if hasTimeRangeFilter(filters.time)}
    <button
      type="button"
      class="text-foreground-l3 hover:bg-background-l5 hover:text-foreground-l1 flex h-8 items-center justify-center rounded-md text-sm transition-colors"
      onclick={() => clearTimeRangeFilter(filters.time)}
    >
      Clear time range
    </button>
  {/if}
</div>
