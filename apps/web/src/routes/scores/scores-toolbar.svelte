<script lang="ts">
  import { arrowNavigation } from '$lib/actions/arrow-navigation'
  import { DropdownMenu, Tooltip } from '$lib/components'
  import {
    IconCheck,
    IconChevronDown,
    IconLayoutListFilled,
    IconPhotoFilled,
    IconSortAscendingNumbers,
    IconSortDescendingShapesFilled,
    IconTableFilled,
    IconUsersGroup,
    IconX,
    type IconComponent,
  } from '$lib/icons'
  import { cn } from '$lib/utils'
  import { getCategoryStyle } from '$lib/utils/categories'
  import { onMount } from 'svelte'
  import ScoresSearchBox from './scores-search-box.svelte'
  import type { SortMode, ViewMode } from './types'

  interface Props {
    viewMode: ViewMode
    sortMode: SortMode
    total: number
    loadedCount: number
    divisions: Record<string, string>
    division: string | undefined
    focusedChallenge: { id: string; name: string; icon: IconComponent; color: string } | null
    search: string
    isSearching: boolean
    onViewModeChange: (mode: ViewMode) => void
    onSortModeChange: (mode: SortMode) => void
    onDivisionChange: (division: string | undefined) => void
    onScreenshotClick: () => void
    onChallengeFocusClear: () => void
    onSearchChange: (value: string) => void
  }

  let {
    viewMode,
    sortMode,
    total,
    loadedCount,
    divisions,
    division,
    focusedChallenge,
    search,
    isSearching,
    onViewModeChange,
    onSortModeChange,
    onDivisionChange,
    onScreenshotClick,
    onChallengeFocusClear,
    onSearchChange,
  }: Props = $props()

  const hasDivisions = $derived(Object.keys(divisions).length > 1)
  const divisionOptions = $derived(
    Object.entries(divisions).map(([value, label]) => ({ value, label }))
  )
  type DivisionSelectionState =
    | { type: 'all'; label: string }
    | { type: 'division'; value: string; label: string }

  const selectedDivision = $derived.by((): DivisionSelectionState => {
    if (!division) return { type: 'all', label: 'All divisions' }
    return { type: 'division', value: division, label: divisions[division] ?? division }
  })
  let mobileSearchInput = $state<HTMLInputElement | null>(null)
  let desktopSearchInput = $state<HTMLInputElement | null>(null)

  const viewOptions = [
    { value: 'challenges' as const, icon: IconTableFilled, label: 'Challenges' },
    { value: 'categories' as const, icon: IconLayoutListFilled, label: 'Categories' },
  ]

  const sortOptions = [
    { value: 'categories' as const, icon: IconSortDescendingShapesFilled, label: 'Category' },
    { value: 'solves' as const, icon: IconSortAscendingNumbers, label: 'Difficulty' },
  ]

  function selectAllDivisions() {
    onDivisionChange(undefined)
  }

  function selectDivision(value: string) {
    onDivisionChange(value)
  }

  function getVisibleSearchInput() {
    if (desktopSearchInput?.offsetParent) return desktopSearchInput
    if (mobileSearchInput?.offsetParent) return mobileSearchInput
    return desktopSearchInput ?? mobileSearchInput
  }

  function focusSearchInput() {
    const input = getVisibleSearchInput()
    input?.focus()
    input?.select()
  }

  onMount(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== 'f') {
        return
      }

      const input = getVisibleSearchInput()
      if (!input) return

      event.preventDefault()
      focusSearchInput()
    }

    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  })
</script>

{#snippet divisionDropdown()}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger
      type="button"
      class="bg-background-l2 text-foreground-l3 hover:bg-background-l3 data-[state=open]:bg-background-l3 focus-visible:ring-ring/50 flex h-9 w-auto items-center justify-between gap-1.5 rounded-md px-3 text-sm whitespace-nowrap outline-none focus-visible:ring-[3px]"
    >
      <span class="truncate">{selectedDivision.label}</span>
      <IconChevronDown class="size-4 shrink-0 opacity-50" />
    </DropdownMenu.Trigger>
    <DropdownMenu.Content
      align="end"
      class="bg-background-l4 min-w-(--bits-dropdown-menu-anchor-width) border-2 border-background-l5"
    >
      <DropdownMenu.Item
        class="data-highlighted:bg-background-l5 justify-between"
        onclick={selectAllDivisions}
      >
        <span>All divisions</span>
        <IconCheck
          class={cn(
            'ml-auto size-4 shrink-0',
            selectedDivision.type !== 'all' && 'text-transparent'
          )}
        />
      </DropdownMenu.Item>
      {#each divisionOptions as option (option.value)}
        <DropdownMenu.Item
          class="data-highlighted:bg-background-l5 justify-between"
          onclick={() => selectDivision(option.value)}
        >
          <span class="truncate">{option.label}</span>
          <IconCheck
            class={cn(
              'ml-auto size-4 shrink-0',
              (selectedDivision.type !== 'division' || selectedDivision.value !== option.value) &&
                'text-transparent'
            )}
          />
        </DropdownMenu.Item>
      {/each}
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{/snippet}

<div class="flex flex-col gap-2 px-4 py-2 md:flex-row md:items-center md:justify-between md:px-9">
  <div class="flex items-center justify-between md:contents">
    <span class="text-foreground-l0 text-lg md:hidden">Scoreboard</span>

    <div
      use:arrowNavigation
      role="toolbar"
      aria-label="Scoreboard display controls"
      class="hidden items-center gap-4 md:flex"
    >
      <div class="flex items-center gap-2">
        <span class="text-foreground-l3 text-sm">View</span>
        <div class="flex items-center gap-0.5">
          {#each viewOptions as option}
            <Tooltip.Root>
              <Tooltip.Trigger>
                {#snippet child({ props })}
                  <button
                    {...props}
                    type="button"
                    aria-label={option.label}
                    aria-pressed={viewMode === option.value}
                    class={cn(
                      'text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l3 focus-visible:ring-ring/50 flex h-9 items-center justify-center rounded-md px-3 outline-none focus-visible:ring-[3px]',
                      viewMode === option.value &&
                        'bg-background-l3 text-foreground-l1 hover:bg-background-l4'
                    )}
                    onclick={() => onViewModeChange(option.value)}
                  >
                    <option.icon class="size-4" />
                  </button>
                {/snippet}
              </Tooltip.Trigger>
              <Tooltip.Content side="bottom">{option.label}</Tooltip.Content>
            </Tooltip.Root>
          {/each}
        </div>
      </div>

      {#if viewMode === 'challenges'}
        <div class="flex items-center gap-2">
          <span class="text-foreground-l3 text-sm">Sort</span>
          <div class="flex items-center gap-0.5">
            {#each sortOptions as option}
              <Tooltip.Root>
                <Tooltip.Trigger>
                  {#snippet child({ props })}
                    <button
                      {...props}
                      type="button"
                      aria-label={option.label}
                      aria-pressed={sortMode === option.value}
                      class={cn(
                        'text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l3 focus-visible:ring-ring/50 flex h-9 items-center justify-center rounded-md px-3 outline-none focus-visible:ring-[3px]',
                        sortMode === option.value &&
                          'bg-background-l3 text-foreground-l1 hover:bg-background-l4'
                      )}
                      onclick={() => onSortModeChange(option.value)}
                    >
                      <option.icon class="size-4" />
                    </button>
                  {/snippet}
                </Tooltip.Trigger>
                <Tooltip.Content side="bottom">{option.label}</Tooltip.Content>
              </Tooltip.Root>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <div class="flex items-center gap-1.5 md:hidden">
      {#if hasDivisions}
        {@render divisionDropdown()}
      {/if}

      <button
        class="text-foreground-l1 bg-background-l2 hover:bg-background-l3 flex h-9 w-9 items-center justify-center rounded-md"
        onclick={onScreenshotClick}
      >
        <IconPhotoFilled class="size-4" />
      </button>
    </div>
  </div>

  <ScoresSearchBox
    bind:inputRef={mobileSearchInput}
    class="md:hidden"
    inputClass="min-w-0 flex-1"
    {search}
    {isSearching}
    {onSearchChange}
  />

  <div class="hidden items-center gap-2 md:flex">
    {#if focusedChallenge}
      <div class="bg-background-l2 flex h-9 items-center gap-1.5 rounded-md px-3">
        <span class="text-foreground-l3 text-sm">Filtering by</span>
        <a
          href="/challenges?challenge={focusedChallenge.id}"
          class="text-category-foreground-l1 flex items-center gap-1 truncate text-sm underline decoration-current/50 underline-offset-2 transition-all hover:decoration-current"
          style={getCategoryStyle(focusedChallenge.color)}
        >
          <focusedChallenge.icon class="size-4 shrink-0" />
          <span>{focusedChallenge.name}</span>
        </a>
        <button
          class="text-foreground-l3 hover:text-foreground-l1 -mr-1.5 flex size-5 shrink-0 items-center justify-center rounded transition-colors"
          onclick={onChallengeFocusClear}
        >
          <IconX class="size-3.5" />
        </button>
      </div>
    {/if}

    <span class="text-foreground-l3 hidden items-center gap-1.5 px-2 text-sm tabular-nums xl:flex">
      <IconUsersGroup class="size-4" />
      {loadedCount.toLocaleString()} / {total.toLocaleString()}
    </span>

    <ScoresSearchBox
      bind:inputRef={desktopSearchInput}
      inputClass="w-28 xl:w-44"
      {search}
      {isSearching}
      {onSearchChange}
    />

    {#if hasDivisions}
      {@render divisionDropdown()}
    {/if}

    <button
      class="text-foreground-l1 bg-background-l2 hover:bg-background-l3 focus-visible:ring-ring/50 flex h-9 items-center justify-center gap-2 rounded-md px-3 outline-none focus-visible:ring-[3px]"
      onclick={onScreenshotClick}
    >
      <IconPhotoFilled class="size-4" />
      <span class="text-foreground-l3 hidden truncate text-sm xl:inline">Screenshot</span>
    </button>
  </div>
</div>
