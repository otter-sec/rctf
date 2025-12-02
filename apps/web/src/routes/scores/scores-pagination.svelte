<script lang="ts">
  import { Tooltip } from '$lib/components'
  import {
    IconChevronLeft,
    IconChevronLeftPipe,
    IconChevronRight,
    IconChevronRightPipe,
    IconLayoutGrid,
    IconLayoutList,
    IconSortAscendingNumbers,
    IconSortDescendingShapesFilled,
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

  const btnClass =
    'h-10 bg-background-l2 px-3 text-foreground-l2 hover:bg-background-l3 hover:text-foreground-l1 disabled:pointer-events-none disabled:opacity-50'

  const pageButtons = $derived([
    {
      icon: IconChevronLeftPipe,
      page: 1,
      disabled: page === 1,
      label: 'First page',
    },
    {
      icon: IconChevronLeft,
      page: Math.max(1, page - 1),
      disabled: page === 1,
      label: 'Previous page',
    },
    {
      icon: IconChevronRight,
      page: Math.min(totalPages || 1, page + 1),
      disabled: page === totalPages,
      label: 'Next page',
    },
    {
      icon: IconChevronRightPipe,
      page: totalPages || 1,
      disabled: page === totalPages,
      label: 'Last page',
    },
  ])
</script>

<div class="flex items-center justify-between gap-1 py-2">
  <div class="flex gap-1">
    <Tooltip.Root disableCloseOnTriggerClick>
      <Tooltip.Trigger
        onclick={() => onViewChange(viewMode === 'zoomer' ? 'boomer' : 'zoomer')}
        class={cn(btnClass, 'rounded-lg')}
      >
        {#if viewMode === 'zoomer'}
          <IconLayoutList class="size-5" />
        {:else}
          <IconLayoutGrid class="size-5" />
        {/if}
      </Tooltip.Trigger>
      <Tooltip.Content>
        {viewMode === 'zoomer' ? 'Detailed view' : 'Compact view'}
      </Tooltip.Content>
    </Tooltip.Root>

    {#if viewMode === 'zoomer'}
      <Tooltip.Root disableCloseOnTriggerClick>
        <Tooltip.Trigger
          onclick={() => onSortChange(sortMode === 'category' ? 'solves' : 'category')}
          class={cn(btnClass, 'rounded-lg')}
        >
          {#if sortMode === 'category'}
            <IconSortDescendingShapesFilled class="size-5" />
          {:else}
            <IconSortAscendingNumbers class="size-5" />
          {/if}
        </Tooltip.Trigger>
        <Tooltip.Content>
          {sortMode === 'category' ? 'Sorted by category' : 'Sorted by difficulty'}
        </Tooltip.Content>
      </Tooltip.Root>
    {/if}
  </div>

  <div class="flex items-center gap-1">
    <div
      class="flex h-10 items-center whitespace-nowrap px-3 text-sm text-foreground-l3"
    >
      Page {page} / {totalPages || 1}
    </div>
    <div class="flex h-10 gap-1 overflow-hidden rounded-lg">
      {#each pageButtons as btn, i}
        <Tooltip.Root disableCloseOnTriggerClick>
          <Tooltip.Trigger
            onclick={() => onPageChange(btn.page)}
            disabled={isRefetching || btn.disabled}
            class={cn(
              btnClass,
              i === 0
                ? 'rounded-r-sm'
                : i === pageButtons.length - 1
                  ? 'rounded-l-sm'
                  : 'rounded-sm'
            )}
          >
            <btn.icon class="size-5" />
          </Tooltip.Trigger>
          <Tooltip.Content>{btn.label}</Tooltip.Content>
        </Tooltip.Root>
      {/each}
    </div>
  </div>
</div>

