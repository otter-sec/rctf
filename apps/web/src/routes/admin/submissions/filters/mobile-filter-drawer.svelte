<script lang="ts">
  import { Drawer, ScrollArea } from '$lib/components'
  import { IconChevronRight, IconClockFilled, IconFilter, IconX } from '$lib/icons'
  import { cn } from '$lib/utils'
  import {
    clearTimeRangeFilter,
    filterOperatorLabel,
    hasTimeRangeFilter,
    includeOperatorLabel,
    setFilterMode,
    type MultiFilter,
    type SubmissionFilters,
  } from '../submissions-filters'
  import SubmissionsFilterOptionList from './filter-option-list.svelte'
  import SubmissionsFilterSearchInput from './filter-search-input.svelte'
  import SubmissionsTimeRangeEditor from './time-range-editor.svelte'
  import { valueFilterSummary, type MobileFilterId, type ValueFilterFamily } from './ui'

  interface Props {
    filters: SubmissionFilters
    valueFamilies: readonly ValueFilterFamily[]
    hasFilters: boolean
    timeRangeSummary: string
    timeRangeError?: string
  }

  let {
    filters = $bindable<SubmissionFilters>(),
    valueFamilies,
    hasFilters,
    timeRangeSummary,
    timeRangeError,
  }: Props = $props()

  let open = $state(false)
  let activeFilterId = $state<MobileFilterId | null>(null)

  const activeValueFamily = $derived(
    valueFamilies.find(family => family.id === activeFilterId) ?? null
  )
  const drawerTitle = $derived(
    activeFilterId === 'time' ? 'Time' : (activeValueFamily?.label ?? 'Filters')
  )

  function valueFilter(family: ValueFilterFamily): MultiFilter<unknown> {
    return filters[family.id] as MultiFilter<unknown>
  }

  function openDrawer() {
    activeFilterId = null
    open = true
  }

  function closeDrawer() {
    open = false
    activeFilterId = null
  }
</script>

{#snippet modeControls(family: ValueFilterFamily)}
  {@const filter = valueFilter(family)}
  <div class="flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2">
    <button
      type="button"
      class={cn(
        'text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l3 flex h-8 items-center rounded-md px-2 text-sm transition-colors',
        filter.mode === 'include' && 'bg-background-l3 text-foreground-l1'
      )}
      onclick={() => setFilterMode(filter, 'include')}
    >
      {includeOperatorLabel(filter.selected.length)}
    </button>
    <button
      type="button"
      class={cn(
        'text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l3 flex h-8 items-center rounded-md px-2 text-sm transition-colors',
        filter.mode === 'exclude' && 'bg-background-l3 text-foreground-l1'
      )}
      onclick={() => setFilterMode(filter, 'exclude')}
    >
      {filterOperatorLabel('exclude', filter.selected.length)}
    </button>
    {#if filter.selected.length > 0}
      <button
        type="button"
        class="text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l3 ml-auto flex h-8 items-center rounded-md px-2 text-sm transition-colors"
        onclick={() => family.clear()}
      >
        Clear
      </button>
    {/if}
  </div>
{/snippet}

{#snippet rootFilterRow(family: ValueFilterFamily)}
  {@const summary = valueFilterSummary(family, valueFilter(family))}
  <button
    type="button"
    class="text-foreground-l2 hover:bg-background-l3 flex h-11 w-full items-center gap-3 rounded-md px-2 text-left transition-colors"
    onclick={() => (activeFilterId = family.id)}
  >
    <family.icon class="text-foreground-l3 size-4 shrink-0" />
    <span class="min-w-0 flex-1 truncate">{family.label}</span>
    {#if summary}
      <span class="text-foreground-l4 shrink-0 text-xs">{summary}</span>
    {/if}
    <IconChevronRight class="text-foreground-l4 size-4 shrink-0" />
  </button>
{/snippet}

{#snippet timeFilterRow()}
  <button
    type="button"
    class="text-foreground-l2 hover:bg-background-l3 flex h-11 w-full items-center gap-3 rounded-md px-2 text-left transition-colors"
    onclick={() => (activeFilterId = 'time')}
  >
    <IconClockFilled class="text-foreground-l3 size-4 shrink-0" />
    <span class="min-w-0 flex-1 truncate">Time</span>
    {#if hasTimeRangeFilter(filters.time)}
      <span class="text-foreground-l4 max-w-40 truncate text-xs">{timeRangeSummary}</span>
    {/if}
    <IconChevronRight class="text-foreground-l4 size-4 shrink-0" />
  </button>
{/snippet}

{#snippet drawerContent()}
  {#if activeValueFamily}
    {#if activeValueFamily.search}
      <div class="border-b-2 px-4 py-3">
        <SubmissionsFilterSearchInput
          value={activeValueFamily.search.value()}
          placeholder={activeValueFamily.search.placeholder}
          onInput={activeValueFamily.search.onInput}
          variant="mobile"
        />
      </div>
    {/if}
    {@render modeControls(activeValueFamily)}
    <ScrollArea class="min-h-0 flex-1" fadeSize={32} fadeColor="background-l1">
      <SubmissionsFilterOptionList family={activeValueFamily} mobile />
    </ScrollArea>
  {:else if activeFilterId === 'time'}
    <ScrollArea class="min-h-0 flex-1" fadeSize={32} fadeColor="background-l1">
      <SubmissionsTimeRangeEditor bind:filters {timeRangeError} />
    </ScrollArea>
  {:else}
    <ScrollArea class="min-h-0 flex-1" fadeSize={32} fadeColor="background-l1">
      <div class="flex flex-col gap-1 p-2">
        {#each valueFamilies as family (family.id)}
          {@render rootFilterRow(family)}
        {/each}
        {@render timeFilterRow()}
      </div>
    </ScrollArea>
  {/if}
{/snippet}

<button
  type="button"
  aria-label="Add filter"
  class={cn(
    'bg-background-l4 text-foreground-l2 hover:bg-background-l5 hover:text-foreground-l1 flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors',
    hasFilters && 'text-foreground-accent'
  )}
  onclick={openDrawer}
>
  <IconFilter class="size-4" />
</button>

<Drawer.Root bind:open>
  <Drawer.Content class="h-[min(38rem,85dvh)] overflow-hidden">
    <Drawer.Header class="shrink-0 border-b-2 px-4 pt-4 pb-3">
      <div class="flex items-center gap-2">
        {#if activeFilterId}
          <button
            type="button"
            aria-label="Back to filters"
            class="text-foreground-l3 hover:bg-background-l3 hover:text-foreground-l1 flex size-8 shrink-0 items-center justify-center rounded-md transition-colors"
            onclick={() => (activeFilterId = null)}
          >
            <IconChevronRight class="size-4 rotate-180" />
          </button>
        {/if}
        <Drawer.Title class="min-w-0 flex-1 truncate text-base">
          {drawerTitle}
        </Drawer.Title>
        <button
          type="button"
          aria-label="Close filters"
          class="text-foreground-l3 hover:bg-background-l3 hover:text-foreground-l1 flex size-8 shrink-0 items-center justify-center rounded-md transition-colors"
          onclick={closeDrawer}
        >
          <IconX class="size-4" />
        </button>
      </div>
      <Drawer.Description class="sr-only">
        Choose submission filters without opening nested menus.
      </Drawer.Description>
    </Drawer.Header>
    {@render drawerContent()}
  </Drawer.Content>
</Drawer.Root>
