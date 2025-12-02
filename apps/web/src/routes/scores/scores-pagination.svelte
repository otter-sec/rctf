<script lang="ts">
  import { DropdownMenu, Tooltip } from '$lib/components'
  import {
    IconChevronLeft,
    IconChevronLeftPipe,
    IconChevronRight,
    IconChevronRightPipe,
    IconLayoutListFilled,
    IconSettingsFilled,
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
  <DropdownMenu.Root>
    <DropdownMenu.Trigger class={cn(btnClass, 'rounded-lg')}>
      <IconSettingsFilled class="size-5" />
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="start" class="w-48">
      <DropdownMenu.Label>View</DropdownMenu.Label>
      <DropdownMenu.RadioGroup
        value={viewMode}
        onValueChange={v => onViewChange(v as ViewMode)}
      >
        <DropdownMenu.RadioItem value="zoomer">
          <IconTableFilled class="size-4 text-foreground-l3" />
          Matrix view
        </DropdownMenu.RadioItem>
        <DropdownMenu.RadioItem value="boomer">
          <IconLayoutListFilled class="size-4 text-foreground-l3" />
          Simple view
        </DropdownMenu.RadioItem>
      </DropdownMenu.RadioGroup>

      <DropdownMenu.Separator />
      <DropdownMenu.Label>Sorting</DropdownMenu.Label>
      <DropdownMenu.RadioGroup
        value={sortMode}
        onValueChange={v => onSortChange(v as SortMode)}
      >
        <Tooltip.Root disabled={viewMode === 'zoomer'}>
          <Tooltip.Trigger class="w-full">
            <DropdownMenu.RadioItem
              value="category"
              disabled={viewMode === 'boomer'}
            >
              <IconSortDescendingShapesFilled
                class="size-4 text-foreground-l3"
              />
              By category
            </DropdownMenu.RadioItem>
          </Tooltip.Trigger>
          <Tooltip.Content side="right"
            >Not available in simple view</Tooltip.Content
          >
        </Tooltip.Root>
        <Tooltip.Root disabled={viewMode === 'zoomer'}>
          <Tooltip.Trigger class="w-full">
            <DropdownMenu.RadioItem
              value="solves"
              disabled={viewMode === 'boomer'}
            >
              <IconSortAscendingNumbers class="size-4 text-foreground-l3" />
              By difficulty
            </DropdownMenu.RadioItem>
          </Tooltip.Trigger>
          <Tooltip.Content side="right"
            >Not available in simple view</Tooltip.Content
          >
        </Tooltip.Root>
      </DropdownMenu.RadioGroup>
    </DropdownMenu.Content>
  </DropdownMenu.Root>

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
