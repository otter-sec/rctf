<script lang="ts">
  import { Drawer, ScrollArea } from '$lib/components'
  import {
    IconCheck,
    IconChevronRight,
    IconFilter,
    IconShieldFilled,
    IconUsersGroup,
    IconX,
  } from '$lib/icons'
  import { cn } from '$lib/utils'
  import TeamStatusDot from './team-status-dot.svelte'
  import {
    clearFilter,
    filterOperatorLabel,
    hasTeamFilters,
    selectedCountLabel,
    setFilterMode,
    TEAM_STATUS_FILTERS,
    teamStatusLabel,
    toggleFilterOption,
    type DivisionFilterOption,
    type FilterMode,
    type TeamFilters,
    type TeamStatusFilter,
  } from './teams-model'

  type MobileTeamFilterId = 'status' | 'division'

  interface Props {
    filters: TeamFilters
    divisionOptions: DivisionFilterOption[]
  }

  let { filters = $bindable<TeamFilters>(), divisionOptions }: Props = $props()

  let open = $state(false)
  let activeFilterId = $state<MobileTeamFilterId | null>(null)

  const hasFilters = $derived(hasTeamFilters(filters))
  const title = $derived(
    activeFilterId === 'status' ? 'Status' : activeFilterId === 'division' ? 'Division' : 'Filters'
  )

  function toggleStatus(status: TeamStatusFilter) {
    toggleFilterOption(filters.status, status, item => item)
  }

  function toggleDivision(division: DivisionFilterOption) {
    toggleFilterOption(filters.division, division, item => item.value)
  }

  function openDrawer() {
    activeFilterId = null
    open = true
  }

  function closeDrawer() {
    open = false
    activeFilterId = null
  }

  function statusSummary() {
    const selected = filters.status.selected[0]
    if (filters.status.selected.length === 0) return ''
    if (filters.status.selected.length === 1 && selected) return teamStatusLabel(selected)
    return selectedCountLabel('status', filters.status.selected.length)
  }

  function divisionSummary() {
    const selected = filters.division.selected[0]
    if (filters.division.selected.length === 0) return ''
    if (filters.division.selected.length === 1 && selected) return selected.label
    return selectedCountLabel('division', filters.division.selected.length)
  }
</script>

{#snippet checkbox(checked: boolean)}
  <span
    class={cn(
      'border-foreground-l4/70 flex size-5 shrink-0 items-center justify-center rounded border-2',
      checked && 'bg-foreground-l1 text-background-l0 border-foreground-l1'
    )}
  >
    {#if checked}
      <IconCheck class="size-3.5" />
    {/if}
  </span>
{/snippet}

{#snippet modeControls(
  mode: FilterMode,
  count: number,
  onSelect: (mode: FilterMode) => void,
  onClear: () => void
)}
  <div class="flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2">
    <button
      type="button"
      class={cn(
        'text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l3 flex h-8 items-center rounded-md px-2 text-sm transition-colors',
        mode === 'include' && 'bg-background-l3 text-foreground-l1'
      )}
      onclick={() => onSelect('include')}
    >
      {filterOperatorLabel('include', count)}
    </button>
    <button
      type="button"
      class={cn(
        'text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l3 flex h-8 items-center rounded-md px-2 text-sm transition-colors',
        mode === 'exclude' && 'bg-background-l3 text-foreground-l1'
      )}
      onclick={() => onSelect('exclude')}
    >
      is not
    </button>
    {#if count > 0}
      <button
        type="button"
        class="text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l3 ml-auto flex h-8 items-center rounded-md px-2 text-sm transition-colors"
        onclick={onClear}
      >
        Clear
      </button>
    {/if}
  </div>
{/snippet}

{#snippet statusOption(status: TeamStatusFilter)}
  {@const selected = filters.status.selected.includes(status)}
  <button
    type="button"
    aria-pressed={selected}
    class="text-foreground-l2 hover:bg-background-l3 flex h-11 w-full items-center gap-3 rounded-md px-2 text-left transition-colors"
    onclick={() => toggleStatus(status)}
  >
    {@render checkbox(selected)}
    <TeamStatusDot {status} />
    <span class="min-w-0 flex-1 truncate">{teamStatusLabel(status)}</span>
  </button>
{/snippet}

{#snippet divisionOption(division: DivisionFilterOption)}
  {@const selected = filters.division.selected.some(item => item.value === division.value)}
  <button
    type="button"
    aria-pressed={selected}
    class="text-foreground-l2 hover:bg-background-l3 flex h-11 w-full items-center gap-3 rounded-md px-2 text-left transition-colors"
    onclick={() => toggleDivision(division)}
  >
    {@render checkbox(selected)}
    <span class="min-w-0 flex-1 truncate">{division.label}</span>
  </button>
{/snippet}

{#snippet rootFilterRow(id: MobileTeamFilterId, label: string, summary: string)}
  <button
    type="button"
    class="text-foreground-l2 hover:bg-background-l3 flex h-11 w-full items-center gap-3 rounded-md px-2 text-left transition-colors"
    onclick={() => (activeFilterId = id)}
  >
    {#if id === 'status'}
      <IconShieldFilled class="text-foreground-l3 size-4 shrink-0" />
    {:else}
      <IconUsersGroup class="text-foreground-l3 size-4 shrink-0" />
    {/if}
    <span class="min-w-0 flex-1 truncate">{label}</span>
    {#if summary}
      <span class="text-foreground-l4 shrink-0 text-xs">{summary}</span>
    {/if}
    <IconChevronRight class="text-foreground-l4 size-4 shrink-0" />
  </button>
{/snippet}

{#snippet drawerContent()}
  {#if activeFilterId === 'status'}
    {@render modeControls(
      filters.status.mode,
      filters.status.selected.length,
      mode => setFilterMode(filters.status, mode),
      () => clearFilter(filters.status)
    )}
    <ScrollArea class="min-h-0 flex-1" fadeSize={32} fadeColor="background-l1">
      <div class="flex flex-col gap-1 p-2">
        {#each TEAM_STATUS_FILTERS as status}
          {@render statusOption(status)}
        {/each}
      </div>
    </ScrollArea>
  {:else if activeFilterId === 'division'}
    {@render modeControls(
      filters.division.mode,
      filters.division.selected.length,
      mode => setFilterMode(filters.division, mode),
      () => clearFilter(filters.division)
    )}
    <ScrollArea class="min-h-0 flex-1" fadeSize={32} fadeColor="background-l1">
      {#if divisionOptions.length === 0}
        <div class="text-foreground-l3 px-4 py-8 text-center text-sm">No divisions found</div>
      {:else}
        <div class="flex flex-col gap-1 p-2">
          {#each divisionOptions as division (division.value)}
            {@render divisionOption(division)}
          {/each}
        </div>
      {/if}
    </ScrollArea>
  {:else}
    <ScrollArea class="min-h-0 flex-1" fadeSize={32} fadeColor="background-l1">
      <div class="flex flex-col gap-1 p-2">
        {@render rootFilterRow('status', 'Status', statusSummary())}
        {@render rootFilterRow('division', 'Division', divisionSummary())}
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
  <Drawer.Content class="h-[min(28rem,80dvh)] overflow-hidden">
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
          {title}
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
        Choose team filters without opening nested menus.
      </Drawer.Description>
    </Drawer.Header>
    {@render drawerContent()}
  </Drawer.Content>
</Drawer.Root>
