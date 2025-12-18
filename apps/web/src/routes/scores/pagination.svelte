<script lang="ts">
  import {
    IconChevronLeft,
    IconChevronLeftPipe,
    IconChevronRight,
    IconChevronRightPipe,
  } from '$lib/icons'
  import { cn } from '$lib/utils'

  interface Props {
    page: number
    totalPages: number
    isFetching?: boolean
    onPageChange: (page: number) => void
  }

  let { page, totalPages, isFetching = false, onPageChange }: Props = $props()

  const btnClass =
    'bg-background-l3 text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l4 flex h-9 w-10 items-center justify-center rounded-md disabled:pointer-events-none disabled:opacity-50'
</script>

<div class="flex items-center gap-0.5">
  <button class={btnClass} onclick={() => onPageChange(1)} disabled={page === 1 || isFetching}>
    <IconChevronLeftPipe class="size-4" />
  </button>
  <button
    class={btnClass}
    onclick={() => onPageChange(page - 1)}
    disabled={page === 1 || isFetching}
  >
    <IconChevronLeft class="size-4" />
  </button>
  <span class={cn('text-foreground-l3 min-w-16 text-center text-sm', isFetching && 'opacity-50')}>
    Page {page}
  </span>
  <button
    class={btnClass}
    onclick={() => onPageChange(page + 1)}
    disabled={page >= totalPages || isFetching}
  >
    <IconChevronRight class="size-4" />
  </button>
  <button
    class={btnClass}
    onclick={() => onPageChange(totalPages)}
    disabled={page >= totalPages || isFetching}
  >
    <IconChevronRightPipe class="size-4" />
  </button>
</div>
