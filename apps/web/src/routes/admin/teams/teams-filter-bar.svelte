<script lang="ts">
  import { Drawer, DropdownMenu, ScrollArea, Spinner } from '$lib/components'
  import {
    IconCheck,
    IconChevronDown,
    IconChevronRight,
    IconFilter,
    IconSearch,
    IconShieldFilled,
    IconUsersGroup,
    IconX,
  } from '$lib/icons'
  import { cn } from '$lib/utils'
  import {
    clearFilter,
    clearTeamFilters,
    filterOperatorLabel,
    hasTeamFilters,
    selectedCountLabel,
    setFilterMode,
    statusTone,
    TEAM_STATUS_FILTERS,
    teamStatusLabel,
    toggleFilterOption,
    type DivisionFilterOption,
    type FilterMode,
    type MultiFilter,
    type TeamFilters,
    type TeamStatusFilter,
  } from './teams-model'

  type MobileTeamFilterId = 'status' | 'division'

  interface Props {
    filters: TeamFilters
    divisionOptions: DivisionFilterOption[]
    isFetching: boolean
    isMobile: boolean
    pinnedToolbarWidth: string
  }

  let {
    filters = $bindable<TeamFilters>(),
    divisionOptions,
    isFetching,
    isMobile,
    pinnedToolbarWidth,
  }: Props = $props()

  let filterDrawerOpen = $state(false)
  let mobileActiveFilterId = $state<MobileTeamFilterId | null>(null)

  const hasFilters = $derived(hasTeamFilters(filters))
  const mobileDrawerTitle = $derived(
    mobileActiveFilterId === 'status'
      ? 'Status'
      : mobileActiveFilterId === 'division'
        ? 'Division'
        : 'Filters'
  )

  function updateSearch(value: string) {
    filters.search = value
  }

  function toggleStatus(status: TeamStatusFilter) {
    toggleFilterOption(filters.status, status, item => item)
  }

  function toggleDivision(division: DivisionFilterOption) {
    toggleFilterOption(filters.division, division, item => item.value)
  }

  function openMobileFilterDrawer() {
    mobileActiveFilterId = null
    filterDrawerOpen = true
  }

  function closeMobileFilterDrawer() {
    filterDrawerOpen = false
    mobileActiveFilterId = null
  }

  function statusFilterSummary() {
    const selected = filters.status.selected[0]
    if (filters.status.selected.length === 0) return ''
    if (filters.status.selected.length === 1 && selected) return teamStatusLabel(selected)
    return selectedCountLabel('status', filters.status.selected.length)
  }

  function divisionFilterSummary() {
    const selected = filters.division.selected[0]
    if (filters.division.selected.length === 0) return ''
    if (filters.division.selected.length === 1 && selected) return selected.label
    return selectedCountLabel('division', filters.division.selected.length)
  }
</script>

{#snippet operatorDropdown(
  mode: 'include' | 'exclude',
  count: number,
  onSelect: (mode: 'include' | 'exclude') => void
)}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger
      class="text-foreground-l4 hover:bg-background-l3 hover:text-foreground-l2 flex h-full items-center gap-1 border-r-2 px-2 transition-colors"
    >
      {filterOperatorLabel(mode, count)}
      <IconChevronDown class="size-3" />
    </DropdownMenu.Trigger>
    <DropdownMenu.Content
      align="start"
      class="bg-background-l4 border-foreground-l4/40 z-[120] w-36 border-2 shadow-xl"
    >
      <DropdownMenu.Item
        class="text-foreground-l2 data-highlighted:!bg-background-l5 data-highlighted:!text-foreground-l2"
        onclick={() => onSelect('include')}
      >
        <IconCheck class={cn('size-4', mode !== 'include' && 'text-transparent')} />
        {count > 1 ? 'is any of' : 'is'}
      </DropdownMenu.Item>
      <DropdownMenu.Item
        class="text-foreground-l2 data-highlighted:!bg-background-l5 data-highlighted:!text-foreground-l2"
        onclick={() => onSelect('exclude')}
      >
        <IconCheck class={cn('size-4', mode !== 'exclude' && 'text-transparent')} />
        is not
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{/snippet}

{#snippet statusDot(status: TeamStatusFilter)}
  {@const tone = statusTone(status)}
  <span
    class="size-1.5 shrink-0 rounded-full"
    class:bg-foreground-success={tone === 'success'}
    class:bg-foreground-yellow-l1={tone === 'warning'}
    class:bg-foreground-destructive={tone === 'danger'}
    class:bg-foreground-accent={tone === 'accent'}
  ></span>
{/snippet}

{#snippet statusOption(status: TeamStatusFilter)}
  {@const selected = filters.status.selected.includes(status)}
  <DropdownMenu.CheckboxItem
    checked={selected}
    closeOnSelect={false}
    textValue={teamStatusLabel(status)}
    class="text-foreground-l2 hover:!bg-background-l5 hover:!text-foreground-l2 flex w-full min-w-0 cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none select-none"
    onCheckedChange={checked => {
      if (checked !== selected) toggleStatus(status)
    }}
  >
    {@render statusDot(status)}
    <span class="min-w-0 truncate">{teamStatusLabel(status)}</span>
  </DropdownMenu.CheckboxItem>
{/snippet}

{#snippet divisionOption(division: DivisionFilterOption)}
  {@const selected = filters.division.selected.some(item => item.value === division.value)}
  <DropdownMenu.CheckboxItem
    checked={selected}
    closeOnSelect={false}
    textValue={division.label}
    class="text-foreground-l2 hover:!bg-background-l5 hover:!text-foreground-l2 flex w-full min-w-0 cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none select-none"
    onCheckedChange={checked => {
      if (checked !== selected) toggleDivision(division)
    }}
  >
    <span class="min-w-0 truncate">{division.label}</span>
  </DropdownMenu.CheckboxItem>
{/snippet}

{#snippet statusFilterSelector()}
  <div class="p-1">
    {#each TEAM_STATUS_FILTERS as status}
      {@render statusOption(status)}
    {/each}
  </div>
{/snippet}

{#snippet divisionFilterSelector()}
  <div class="p-1">
    {#if divisionOptions.length === 0}
      <div class="text-foreground-l3 px-2 py-1.5 text-sm">No divisions found</div>
    {:else}
      {#each divisionOptions as division (division.value)}
        {@render divisionOption(division)}
      {/each}
    {/if}
  </div>
{/snippet}

{#snippet mobileCheckbox(checked: boolean)}
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

{#snippet mobileFilterModeControls(
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

{#snippet mobileStatusOption(status: TeamStatusFilter)}
  {@const selected = filters.status.selected.includes(status)}
  <button
    type="button"
    aria-pressed={selected}
    class="text-foreground-l2 hover:bg-background-l3 flex h-11 w-full items-center gap-3 rounded-md px-2 text-left transition-colors"
    onclick={() => toggleStatus(status)}
  >
    {@render mobileCheckbox(selected)}
    {@render statusDot(status)}
    <span class="min-w-0 flex-1 truncate">{teamStatusLabel(status)}</span>
  </button>
{/snippet}

{#snippet mobileDivisionOption(division: DivisionFilterOption)}
  {@const selected = filters.division.selected.some(item => item.value === division.value)}
  <button
    type="button"
    aria-pressed={selected}
    class="text-foreground-l2 hover:bg-background-l3 flex h-11 w-full items-center gap-3 rounded-md px-2 text-left transition-colors"
    onclick={() => toggleDivision(division)}
  >
    {@render mobileCheckbox(selected)}
    <span class="min-w-0 flex-1 truncate">{division.label}</span>
  </button>
{/snippet}

{#snippet mobileRootFilterRow(id: MobileTeamFilterId, label: string, summary: string)}
  <button
    type="button"
    class="text-foreground-l2 hover:bg-background-l3 flex h-11 w-full items-center gap-3 rounded-md px-2 text-left transition-colors"
    onclick={() => (mobileActiveFilterId = id)}
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

{#snippet mobileFilterDrawerContent()}
  {#if mobileActiveFilterId === 'status'}
    {@render mobileFilterModeControls(
      filters.status.mode,
      filters.status.selected.length,
      mode => setFilterMode(filters.status, mode),
      () => clearFilter(filters.status)
    )}
    <ScrollArea class="min-h-0 flex-1" fadeSize={32} fadeColor="background-l1">
      <div class="flex flex-col gap-1 p-2">
        {#each TEAM_STATUS_FILTERS as status}
          {@render mobileStatusOption(status)}
        {/each}
      </div>
    </ScrollArea>
  {:else if mobileActiveFilterId === 'division'}
    {@render mobileFilterModeControls(
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
            {@render mobileDivisionOption(division)}
          {/each}
        </div>
      {/if}
    </ScrollArea>
  {:else}
    <ScrollArea class="min-h-0 flex-1" fadeSize={32} fadeColor="background-l1">
      <div class="flex flex-col gap-1 p-2">
        {@render mobileRootFilterRow('status', 'Status', statusFilterSummary())}
        {@render mobileRootFilterRow('division', 'Division', divisionFilterSummary())}
      </div>
    </ScrollArea>
  {/if}
{/snippet}

{#snippet mobileFilterDrawer()}
  <Drawer.Root bind:open={filterDrawerOpen}>
    <Drawer.Content class="h-[min(28rem,80dvh)] overflow-hidden">
      <Drawer.Header class="shrink-0 border-b-2 px-4 pt-4 pb-3">
        <div class="flex items-center gap-2">
          {#if mobileActiveFilterId}
            <button
              type="button"
              aria-label="Back to filters"
              class="text-foreground-l3 hover:bg-background-l3 hover:text-foreground-l1 flex size-8 shrink-0 items-center justify-center rounded-md transition-colors"
              onclick={() => (mobileActiveFilterId = null)}
            >
              <IconChevronRight class="size-4 rotate-180" />
            </button>
          {/if}
          <Drawer.Title class="min-w-0 flex-1 truncate text-base">
            {mobileDrawerTitle}
          </Drawer.Title>
          <button
            type="button"
            aria-label="Close filters"
            class="text-foreground-l3 hover:bg-background-l3 hover:text-foreground-l1 flex size-8 shrink-0 items-center justify-center rounded-md transition-colors"
            onclick={closeMobileFilterDrawer}
          >
            <IconX class="size-4" />
          </button>
        </div>
        <Drawer.Description class="sr-only">
          Choose team filters without opening nested menus.
        </Drawer.Description>
      </Drawer.Header>
      {@render mobileFilterDrawerContent()}
    </Drawer.Content>
  </Drawer.Root>
{/snippet}

{#snippet filterMenu()}
  {#if isMobile}
    <button
      type="button"
      aria-label="Add filter"
      class={cn(
        'bg-background-l4 text-foreground-l2 hover:bg-background-l5 hover:text-foreground-l1 flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors',
        hasFilters && 'text-foreground-accent'
      )}
      onclick={openMobileFilterDrawer}
    >
      <IconFilter class="size-4" />
    </button>
    {@render mobileFilterDrawer()}
  {:else}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Add filter"
        class={cn(
          'bg-background-l4 text-foreground-l2 hover:bg-background-l5 hover:text-foreground-l1 flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors',
          hasFilters && 'text-foreground-accent'
        )}
      >
        <IconFilter class="size-4" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        align="start"
        class="bg-background-l4 border-foreground-l4/40 z-[100] w-56 overflow-hidden border-2 !p-1 shadow-xl"
      >
        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger
            class="text-foreground-l2 data-highlighted:!bg-background-l5 data-highlighted:!text-foreground-l2 data-[state=open]:!bg-background-l5 data-[state=open]:!text-foreground-l2"
          >
            <IconShieldFilled class="size-4" />
            Status
          </DropdownMenu.SubTrigger>
          <DropdownMenu.SubContent
            align="start"
            alignOffset={-6}
            sideOffset={10}
            class="bg-background-l4 border-foreground-l4/40 z-[110] w-48 border-2 shadow-xl"
          >
            {@render statusFilterSelector()}
          </DropdownMenu.SubContent>
        </DropdownMenu.Sub>
        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger
            class="text-foreground-l2 data-highlighted:!bg-background-l5 data-highlighted:!text-foreground-l2 data-[state=open]:!bg-background-l5 data-[state=open]:!text-foreground-l2"
          >
            <IconUsersGroup class="size-4" />
            Division
          </DropdownMenu.SubTrigger>
          <DropdownMenu.SubContent
            align="start"
            alignOffset={-6}
            sideOffset={10}
            class="bg-background-l4 border-foreground-l4/40 z-[110] w-56 border-2 shadow-xl"
          >
            {@render divisionFilterSelector()}
          </DropdownMenu.SubContent>
        </DropdownMenu.Sub>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  {/if}
{/snippet}

{#snippet searchInput()}
  <div
    class="bg-background-l2 text-foreground-l3 flex h-8 min-w-52 shrink-0 items-center gap-2 rounded-md border-2 px-2 md:w-72"
  >
    <IconSearch class="size-3.5 shrink-0" />
    <input
      type="text"
      value={filters.search}
      placeholder="Search teams or email..."
      oninput={event => updateSearch(event.currentTarget.value)}
      class="placeholder:text-foreground-l4 text-foreground-l1 min-w-0 flex-1 bg-transparent text-sm outline-none"
    />
  </div>
{/snippet}

{#snippet valueFilterCount(label: string, count: number)}
  <span class="text-foreground-l1 min-w-0 truncate">
    {count}
    {label}{count === 1 ? '' : 's'}
  </span>
{/snippet}

{#snippet statusChipValue()}
  {@const selected = filters.status.selected[0]}
  {#if filters.status.selected.length === 1 && selected}
    {@render statusDot(selected)}
    <span class="text-foreground-l1 min-w-0 truncate">{teamStatusLabel(selected)}</span>
  {:else}
    {@render valueFilterCount('status', filters.status.selected.length)}
  {/if}
{/snippet}

{#snippet divisionChipValue()}
  {@const selected = filters.division.selected[0]}
  {#if filters.division.selected.length === 1 && selected}
    <span class="text-foreground-l1 min-w-0 truncate">{selected.label}</span>
  {:else}
    {@render valueFilterCount('division', filters.division.selected.length)}
  {/if}
{/snippet}

{#snippet valueFilterChip(
  label: string,
  filter: MultiFilter<unknown>,
  selector: 'status' | 'division'
)}
  <span
    class="bg-background-l2 inline-flex h-8 shrink-0 items-center overflow-hidden rounded-md border-2 text-sm"
  >
    <span class="text-foreground-l3 flex h-full items-center gap-1 border-r-2 px-2">
      {#if selector === 'status'}
        <IconShieldFilled class="size-3.5" />
      {:else}
        <IconUsersGroup class="size-3.5" />
      {/if}
      {label}
    </span>
    {@render operatorDropdown(filter.mode, filter.selected.length, mode =>
      setFilterMode(filter, mode)
    )}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        class="hover:bg-background-l3 flex h-full min-w-0 items-center gap-1.5 px-2 transition-colors"
      >
        {#if selector === 'status'}
          {@render statusChipValue()}
        {:else}
          {@render divisionChipValue()}
        {/if}
        <IconChevronDown class="text-foreground-l4 size-3 shrink-0" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        align="start"
        class="bg-background-l4 border-foreground-l4/40 z-[120] w-56 border-2 shadow-xl"
      >
        {#if selector === 'status'}
          {@render statusFilterSelector()}
        {:else}
          {@render divisionFilterSelector()}
        {/if}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
    <button
      type="button"
      aria-label="Remove {label.toLowerCase()} filters"
      class="text-foreground-l3 hover:text-foreground-l1 flex h-full w-7 shrink-0 items-center justify-center border-l-2"
      onclick={() => {
        if (selector === 'status') clearFilter(filters.status)
        else clearFilter(filters.division)
      }}
    >
      <IconX class="size-3.5" />
    </button>
  </span>
{/snippet}

{#snippet filterChips()}
  <div
    class="hidden min-w-0 flex-1 flex-wrap items-center gap-1.5 overflow-visible whitespace-nowrap md:flex"
  >
    {#if filters.status.selected.length > 0}
      {@render valueFilterChip('Status', filters.status, 'status')}
    {/if}
    {#if filters.division.selected.length > 0}
      {@render valueFilterChip('Division', filters.division, 'division')}
    {/if}
  </div>
{/snippet}

<div
  class="bg-background-l1 sticky left-0 z-20 flex min-w-0 items-center gap-3 overflow-visible border-b-2 px-3 py-2"
  style:width={pinnedToolbarWidth}
>
  {@render filterMenu()}
  {@render searchInput()}
  {@render filterChips()}
  {#if hasFilters}
    <button
      type="button"
      class="text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l3 flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-sm transition-colors"
      onclick={() => clearTeamFilters(filters)}
    >
      <IconX class="size-3.5" />
      Clear
    </button>
  {/if}
  {#if isFetching}
    <Spinner class="text-foreground-l3 size-4 shrink-0" />
  {/if}
</div>
