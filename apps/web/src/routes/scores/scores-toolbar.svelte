<script lang="ts">
  import { Checkbox, Label, Select, Tooltip } from '$lib/components'
  import {
    IconLayoutListFilled,
    IconPhotoFilled,
    IconSortAscendingNumbers,
    IconSortDescendingShapesFilled,
    IconTableFilled,
  } from '$lib/icons'
  import { cn } from '$lib/utils'
  import type { SortMode, ViewMode } from './types'

  interface Props {
    viewMode: ViewMode
    sortMode: SortMode
    total: number
    loadedCount: number
    isFetching: boolean
    showTop3Context: boolean
    divisions: Record<string, string>
    division: string | undefined
    onViewModeChange: (mode: ViewMode) => void
    onSortModeChange: (mode: SortMode) => void
    onDivisionChange: (division: string | undefined) => void
    onShowTop3ContextChange: (show: boolean) => void
    onScreenshotClick: () => void
  }

  let {
    viewMode,
    sortMode,
    total,
    loadedCount,
    isFetching,
    showTop3Context,
    divisions,
    division,
    onViewModeChange,
    onSortModeChange,
    onDivisionChange,
    onShowTop3ContextChange,
    onScreenshotClick,
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

  <div class="flex items-center gap-2 md:gap-4">
    {#if hasDivisions}
      <Select.Root
        type="single"
        value={division ?? '__all__'}
        onValueChange={v => onDivisionChange(v === '__all__' ? undefined : v)}
      >
        <Select.Trigger
          size="sm"
          class="bg-background-l2 hover:bg-background-l3 w-auto gap-1.5 border-none"
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

    <div class="hidden items-center gap-2 md:flex">
      <Checkbox
        id="show-top3"
        checked={showTop3Context}
        onCheckedChange={v => onShowTop3ContextChange(v === true)}
      />
      <Label for="show-top3" class="text-foreground-l3 cursor-pointer truncate text-sm font-normal"
        >Show top 3 when scrolling</Label
      >
    </div>

    <span
      class={cn('text-foreground-l3 hidden truncate text-sm xl:inline', isFetching && 'opacity-50')}
    >
      {loadedCount.toLocaleString()} / {total.toLocaleString()} teams
    </span>

    <button
      class="text-foreground-l1 bg-background-l2 hover:bg-background-l3 flex h-9 items-center justify-center gap-2 rounded-md px-3"
      onclick={onScreenshotClick}
    >
      <IconPhotoFilled class="size-4" />
      <span class="text-foreground-l3 truncate text-sm">Screenshot</span>
    </button>
  </div>
</div>
