<script lang="ts">
  import { Button, ButtonGroup, PaginationControls, Tooltip } from '$lib/components'
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
    page: number
    totalPages: number
    isRefetching: boolean
    sortMode: SortMode
    viewMode: ViewMode
    onPageChange: (page: number) => void
    onSortChange: (mode: SortMode) => void
    onViewChange: (mode: ViewMode) => void
  }

  let {
    page,
    totalPages,
    isRefetching,
    sortMode,
    viewMode,
    onPageChange,
    onSortChange,
    onViewChange,
  }: Props = $props()

  const viewOptions: { value: ViewMode; icon: typeof IconTableFilled; label: string }[] = [
    { value: 'zoomer', icon: IconTableFilled, label: 'Matrix' },
    { value: 'boomer', icon: IconLayoutListFilled, label: 'Simple' },
    { value: 'minimal', icon: IconListFilled, label: 'Minimal' },
  ]

  const sortOptions: { value: SortMode; icon: typeof IconTableFilled; label: string }[] = [
    { value: 'category', icon: IconSortDescendingShapesFilled, label: 'Category' },
    { value: 'solves', icon: IconSortAscendingNumbers, label: 'Difficulty' },
  ]

  const toggleBtnClass =
    'h-9 px-3 text-foreground-l3 hover:text-foreground-l1 disabled:pointer-events-none disabled:opacity-50'
  const toggleBtnActiveClass = 'bg-background-l3 text-foreground-l1'
</script>

<div class="flex items-center justify-between gap-4 py-2">
  <div class="flex items-center gap-4">
    <div class="flex items-center gap-2">
      <span class="text-sm text-foreground-l3">View</span>
      <ButtonGroup.Root class="gap-0.5">
        {#each viewOptions as option}
          {@const isActive = viewMode === option.value}
          <Tooltip.Root>
            <Tooltip.Trigger>
              <Button
                variant="ghost"
                size="sm"
                class={cn(toggleBtnClass, isActive && toggleBtnActiveClass)}
                onclick={() => onViewChange(option.value)}
              >
                <option.icon class="size-4" />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom">{option.label}</Tooltip.Content>
          </Tooltip.Root>
        {/each}
      </ButtonGroup.Root>
    </div>

    {#if viewMode === 'zoomer'}
      <div class="flex items-center gap-2">
        <span class="text-sm text-foreground-l3">Sort</span>
        <ButtonGroup.Root class="gap-0.5">
          {#each sortOptions as option}
            {@const isActive = sortMode === option.value}
            <Tooltip.Root>
              <Tooltip.Trigger>
                <Button
                  variant="ghost"
                  size="sm"
                  class={cn(toggleBtnClass, isActive && toggleBtnActiveClass)}
                  onclick={() => onSortChange(option.value)}
                >
                  <option.icon class="size-4" />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content side="bottom">{option.label}</Tooltip.Content>
            </Tooltip.Root>
          {/each}
        </ButtonGroup.Root>
      </div>
    {/if}
  </div>

  <PaginationControls {page} {totalPages} disabled={isRefetching} {onPageChange} />
</div>
