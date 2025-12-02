<script lang="ts">
  import { Tooltip } from '$lib/components'
  import {
    IconChevronLeft,
    IconChevronLeftPipe,
    IconChevronRight,
    IconChevronRightPipe,
  } from '$lib/icons'

  interface Props {
    page: number
    totalPages: number
    isRefetching: boolean
    onPageChange: (page: number) => void
  }

  let { page, totalPages, isRefetching, onPageChange }: Props = $props()
</script>

<div class="flex items-center justify-end gap-1 py-2">
  <div
    class="flex h-10 items-center whitespace-nowrap px-3 text-sm text-foreground-l3"
  >
    Page {page} / {totalPages || 1}
  </div>
  <div class="flex h-10 gap-1 overflow-hidden rounded-lg">
    <Tooltip.Root disableCloseOnTriggerClick>
      <Tooltip.Trigger
        onclick={() => onPageChange(1)}
        disabled={isRefetching || page === 1}
        class="h-10 rounded-r-sm bg-background-l2 px-3 text-foreground-l2 hover:bg-background-l3 hover:text-foreground-l1 disabled:pointer-events-none disabled:opacity-50"
      >
        <IconChevronLeftPipe class="size-5" />
      </Tooltip.Trigger>
      <Tooltip.Content>First page</Tooltip.Content>
    </Tooltip.Root>
    <Tooltip.Root disableCloseOnTriggerClick>
      <Tooltip.Trigger
        onclick={() => onPageChange(Math.max(1, page - 1))}
        disabled={isRefetching || page === 1}
        class="h-10 rounded-sm bg-background-l2 px-3 text-foreground-l2 hover:bg-background-l3 hover:text-foreground-l1 disabled:pointer-events-none disabled:opacity-50"
      >
        <IconChevronLeft class="size-5" />
      </Tooltip.Trigger>
      <Tooltip.Content>Previous page</Tooltip.Content>
    </Tooltip.Root>
    <Tooltip.Root disableCloseOnTriggerClick>
      <Tooltip.Trigger
        onclick={() => onPageChange(Math.min(totalPages || 1, page + 1))}
        disabled={isRefetching || page === totalPages}
        class="h-10 rounded-sm bg-background-l2 px-3 text-foreground-l2 hover:bg-background-l3 hover:text-foreground-l1 disabled:pointer-events-none disabled:opacity-50"
      >
        <IconChevronRight class="size-5" />
      </Tooltip.Trigger>
      <Tooltip.Content>Next page</Tooltip.Content>
    </Tooltip.Root>
    <Tooltip.Root disableCloseOnTriggerClick>
      <Tooltip.Trigger
        onclick={() => onPageChange(totalPages || 1)}
        disabled={isRefetching || page === totalPages}
        class="h-10 rounded-l-sm bg-background-l2 px-3 text-foreground-l2 hover:bg-background-l3 hover:text-foreground-l1 disabled:pointer-events-none disabled:opacity-50"
      >
        <IconChevronRightPipe class="size-5" />
      </Tooltip.Trigger>
      <Tooltip.Content>Last page</Tooltip.Content>
    </Tooltip.Root>
  </div>
</div>
