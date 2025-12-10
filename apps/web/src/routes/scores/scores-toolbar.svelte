<script lang="ts">
  import { Checkbox, Label, Tooltip } from '$lib/components'
  import {
    IconLayoutListFilled,
    IconListFilled,
    IconSortAscendingNumbers,
    IconSortDescendingShapesFilled,
    IconTableFilled,
  } from '$lib/icons'
  import { cn } from '$lib/utils'
  import type { SortMode, ViewMode } from './types'

  interface Props {
    viewMode: ViewMode
    sortMode: SortMode
    page: number
    isFetching: boolean
    showTop3Context: boolean
    onViewModeChange: (mode: ViewMode) => void
    onSortModeChange: (mode: SortMode) => void
    onPageChange: (page: number) => void
    onShowTop3ContextChange: (show: boolean) => void
  }

  let {
    viewMode,
    sortMode,
    page,
    isFetching,
    showTop3Context,
    onViewModeChange,
    onSortModeChange,
    onPageChange,
    onShowTop3ContextChange,
  }: Props = $props()

  const viewOptions = [
    { value: 'challenges' as const, icon: IconTableFilled, label: 'Challenges' },
    { value: 'categories' as const, icon: IconLayoutListFilled, label: 'Categories' },
    { value: 'minimal' as const, icon: IconListFilled, label: 'Minimal' },
  ]

  const sortOptions = [
    { value: 'categories' as const, icon: IconSortDescendingShapesFilled, label: 'Category' },
    { value: 'solves' as const, icon: IconSortAscendingNumbers, label: 'Difficulty' },
  ]
</script>

<div class="flex items-center justify-between px-9 py-2">
  <div class="flex items-center gap-4">
    <div class="flex items-center gap-2">
      <span class="text-foreground-l3 text-sm">View</span>
      <div class="flex items-center gap-0.5">
        {#each viewOptions as option}
          <Tooltip.Root>
            <Tooltip.Trigger>
              <button
                class={cn(
                  'text-foreground-l3 hover:text-foreground-l1 flex h-9 items-center justify-center rounded-lg px-3',
                  viewMode === option.value && 'bg-background-l3 text-foreground-l1'
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
                    'text-foreground-l3 hover:text-foreground-l1 flex h-9 items-center justify-center rounded-lg px-3',
                    sortMode === option.value && 'bg-background-l3 text-foreground-l1'
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

  <div class="flex items-center gap-4">
    <div class="flex items-center gap-2">
      <Checkbox
        id="show-top3"
        checked={showTop3Context}
        onCheckedChange={v => onShowTop3ContextChange(v === true)}
      />
      <Label for="show-top3" class="text-foreground-l3 cursor-pointer text-sm">Show top 3</Label>
    </div>

    <div class="flex items-center gap-2">
      <button
        class="bg-background-l2 text-foreground-l2 hover:bg-background-l3 rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
        onclick={() => onPageChange(page - 1)}
        disabled={page === 1 || isFetching}
      >
        Prev
      </button>
      <span class={cn('text-foreground-l3 text-sm', isFetching && 'opacity-50')}>
        Page {page}
      </span>
      <button
        class="bg-background-l2 text-foreground-l2 hover:bg-background-l3 rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
        onclick={() => onPageChange(page + 1)}
        disabled={isFetching}
      >
        Next
      </button>
    </div>
  </div>
</div>
