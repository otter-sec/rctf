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

  let {
    page,
    totalPages,
    disabled = false,
    variant = 'default',
    onPageChange,
  }: Props = $props()

  const baseClass = 'h-10 px-3 disabled:pointer-events-none disabled:opacity-50'

  const variantClasses = $derived(
    variant === 'rounded'
      ? 'bg-background-l3 text-foreground-l2 hover:bg-background-l4 hover:text-foreground-l1'
      : 'bg-background-l2 text-foreground-l2 hover:bg-background-l3 hover:text-foreground-l1'
  )

  const containerClass = $derived(
    variant === 'rounded' ? 'rounded-full' : 'rounded-lg'
  )

  const pageButtons = $derived([
    {
      icon: IconChevronLeftPipe,
      targetPage: 1,
      disabled: page === 1,
      label: 'First page',
    },
    {
      icon: IconChevronLeft,
      targetPage: Math.max(1, page - 1),
      disabled: page === 1,
      label: 'Previous page',
    },
    {
      icon: IconChevronRight,
      targetPage: Math.min(totalPages || 1, page + 1),
      disabled: page === totalPages || totalPages === 0,
      label: 'Next page',
    },
    {
      icon: IconChevronRightPipe,
      targetPage: totalPages || 1,
      disabled: page === totalPages || totalPages === 0,
      label: 'Last page',
    },
  ])
</script>

<div class="flex items-center gap-1">
  <div
    class="flex h-10 items-center whitespace-nowrap px-3 text-sm text-foreground-l3"
  >
    Page {page} / {totalPages || 1}
  </div>
  <div class={cn('flex h-10 gap-1 overflow-hidden', containerClass)}>
    {#each pageButtons as btn, i}
      <Tooltip.Root disableCloseOnTriggerClick>
        <Tooltip.Trigger
          onclick={() => onPageChange(btn.targetPage)}
          disabled={disabled || btn.disabled}
          class={cn(
            baseClass,
            variantClasses,
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
