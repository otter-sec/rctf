<script lang="ts">
  import { cn, type WithElementRef } from '$lib/utils'
  import type { Snippet } from 'svelte'
  import type { HTMLAnchorAttributes } from 'svelte/elements'

  let {
    ref = $bindable(null),
    children,
    child,
    class: className,
    size = 'md',
    isActive = false,
    ...restProps
  }: WithElementRef<HTMLAnchorAttributes> & {
    child?: Snippet<[{ props: Record<string, unknown> }]>
    size?: 'sm' | 'md'
    isActive?: boolean
  } = $props()

  const mergedProps = $derived({
    class: cn(
      'text-foreground-l0 ring-ring hover:bg-background-l3 hover:text-foreground-l0 active:bg-background-l3 active:text-foreground-l0 [&>svg]:text-foreground-l0 outline-hidden flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
      'data-[active=true]:bg-background-l3 data-[active=true]:text-foreground-l0',
      size === 'sm' && 'text-xs',
      size === 'md' && 'text-sm',
      'group-data-[collapsible=icon]:hidden',
      className
    ),
    'data-slot': 'sidebar-menu-sub-button',
    'data-sidebar': 'menu-sub-button',
    'data-size': size,
    'data-active': isActive,
    ...restProps,
  })
</script>

{#if child}
  {@render child({ props: mergedProps })}
{:else}
  <a bind:this={ref} {...mergedProps}>
    {@render children?.()}
  </a>
{/if}
