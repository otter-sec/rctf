<script lang="ts">
  import { Select, Tooltip } from '$lib/components'
  import {
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
  import type { SortMode, ViewMode } from './types'

  interface Props {
    viewMode: ViewMode
    sortMode: SortMode
    total: number
    loadedCount: number
    divisions: Record<string, string>
    division: string | undefined
    focusedChallenge: { id: string; name: string; icon: IconComponent; color: string } | null
    onViewModeChange: (mode: ViewMode) => void
    onSortModeChange: (mode: SortMode) => void
    onDivisionChange: (division: string | undefined) => void
    onScreenshotClick: () => void
    onChallengeFocusClear: () => void
  }

  let {
    viewMode,
    sortMode,
    total,
    loadedCount,
    divisions,
    division,
    focusedChallenge,
    onViewModeChange,
    onSortModeChange,
    onDivisionChange,
    onScreenshotClick,
    onChallengeFocusClear,
  }: Props = $props()

  const hasDivisions = $derived(Object.keys(divisions).length > 1)
  const divisionOptions = $derived(
    Object.entries(divisions).map(([value, label]) => ({ value, label }))
  )
  const selectedDivisionLabel = $derived(
    division ? (divisions[division] ?? division) : 'All divisions'
  )

  const viewOptions = [
    { value: 'challenges' as const, icon: IconTableFilled, label: 'Challenges' },
    { value: 'categories' as const, icon: IconLayoutListFilled, label: 'Categories' },
  ]

  const sortOptions = [
    { value: 'categories' as const, icon: IconSortDescendingShapesFilled, label: 'Category' },
    { value: 'solves' as const, icon: IconSortAscendingNumbers, label: 'Difficulty' },
  ]
</script>

<div class="flex items-center justify-between px-4 py-2 md:px-9">
  <span class="text-foreground-l0 text-lg md:hidden">Scoreboard</span>

  <div class="hidden items-center gap-4 md:flex">
    <div class="flex items-center gap-2">
      <span class="text-foreground-l3 text-sm">View</span>
      <div class="flex items-center gap-0.5">
        {#each viewOptions as option}
          <Tooltip.Root>
            <Tooltip.Trigger>
              <button
                class={cn(
                  'text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l3 flex h-9 items-center justify-center rounded-md px-3',
                  viewMode === option.value &&
                    'bg-background-l3 text-foreground-l1 hover:bg-background-l4'
                )}
                onclick={() => onViewModeChange(option.value)}
              >
                <option.icon class="size-4" />
              </button>
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
                <button
                  class={cn(
                    'text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l3 flex h-9 items-center justify-center rounded-md px-3',
                    sortMode === option.value &&
                      'bg-background-l3 text-foreground-l1 hover:bg-background-l4'
                  )}
                  onclick={() => onSortModeChange(option.value)}
                >
                  <option.icon class="size-4" />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content side="bottom">{option.label}</Tooltip.Content>
            </Tooltip.Root>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <div class="flex items-center gap-2">
    {#if focusedChallenge}
      <div class="flex h-9 items-center gap-1.5 bg-background-l2 rounded-md px-3">
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

    {#if hasDivisions}
      <Select.Root
        type="single"
        value={division ?? '__all__'}
        onValueChange={v => onDivisionChange(v === '__all__' ? undefined : v)}
      >
        <Select.Trigger
          size="sm"
          class="bg-background-l2 text-foreground-l3 hover:bg-background-l3 h-9! w-auto gap-1.5 border-none"
        >
          {selectedDivisionLabel}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="__all__" label="All divisions">All divisions</Select.Item>
          {#each divisionOptions as option (option.value)}
            <Select.Item value={option.value} label={option.label}>
              {option.label}
            </Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    {/if}

    <button
      class="text-foreground-l1 bg-background-l2 hover:bg-background-l3 flex h-9 items-center justify-center gap-2 rounded-md px-3"
      onclick={onScreenshotClick}
    >
      <IconPhotoFilled class="size-4" />
      <span class="text-foreground-l3 hidden truncate text-sm xl:inline">Screenshot</span>
    </button>
  </div>
</div>
