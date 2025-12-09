<!-- TODO(enscribe): don't use this -->
<script lang="ts">
  import { Tooltip } from '$lib/components'
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
    disabled?: boolean
    variant?: 'default' | 'rounded'
    onPageChange: (page: number) => void
  }

  let { page, totalPages, disabled = false, variant = 'default', onPageChange }: Props = $props()

  const atStart = $derived(page === 1)
  const atEnd = $derived(page === totalPages || totalPages === 0)
  const safeTotalPages = $derived(totalPages || 1)

  const pageButtons = $derived([
    {
      icon: IconChevronLeftPipe,
      targetPage: 1,
      disabled: atStart,
      label: 'First page',
      roundedClass: 'rounded-r-sm',
    },
    {
      icon: IconChevronLeft,
      targetPage: Math.max(1, page - 1),
      disabled: atStart,
      label: 'Previous page',
      roundedClass: 'rounded-sm',
    },
    {
      icon: IconChevronRight,
      targetPage: Math.min(safeTotalPages, page + 1),
      disabled: atEnd,
      label: 'Next page',
      roundedClass: 'rounded-sm',
    },
    {
      icon: IconChevronRightPipe,
      targetPage: safeTotalPages,
      disabled: atEnd,
      label: 'Last page',
      roundedClass: 'rounded-l-sm',
    },
  ])
</script>

<div class="flex items-center gap-1">
  <div class="text-foreground-l3 flex h-10 items-center px-3 text-sm whitespace-nowrap">
    Page {page} / {safeTotalPages}
  </div>
  <div
    class={cn(
      'flex h-10 gap-1 overflow-hidden',
      variant === 'rounded' ? 'rounded-full' : 'rounded-lg'
    )}
  >
    {#each pageButtons as btn}
      <Tooltip.Root disableCloseOnTriggerClick>
        <Tooltip.Trigger
          onclick={() => onPageChange(btn.targetPage)}
          disabled={disabled || btn.disabled}
          class={cn(
            'bg-background-l4 text-foreground-l1 hover:bg-background-l5 h-10 px-3 disabled:pointer-events-none disabled:opacity-50',
            btn.roundedClass
          )}
        >
          <btn.icon class="size-5" />
        </Tooltip.Trigger>
        <Tooltip.Content>{btn.label}</Tooltip.Content>
      </Tooltip.Root>
    {/each}
  </div>
</div>
