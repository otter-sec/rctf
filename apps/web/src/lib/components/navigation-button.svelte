<script lang="ts">
  import { page } from '$app/state'
  import { cn } from '$lib/utils'
  import type { Snippet } from 'svelte'

  interface Props {
    ref?: HTMLAnchorElement | HTMLButtonElement | null
    href?: string
    activePath?: string
    icon: Snippet<[{ class: string }]>
    class?: string
    type?: 'button' | 'submit' | 'reset' | null | undefined
    [key: string]: unknown
  }

  let {
    ref = $bindable(null),
    href,
    activePath,
    icon,
    class: classNameProp,
    type = 'button',
    ...restProps
  }: Props = $props()

  const isActive = $derived.by(() => {
    if (!activePath) return false
    if (activePath === '/') return page.url.pathname === '/'
    return page.url.pathname.startsWith(activePath)
  })

  const className = $derived(
    cn(
      'flex items-center justify-center rounded-lg px-4 py-3 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]',
      isActive
        ? 'bg-background-accent hover:bg-background-accent-hover'
        : 'bg-background-l2 hover:bg-background-l3',
      classNameProp
    )
  )

  const iconClassName = $derived(
    cn('size-6', isActive ? 'text-foreground-accent' : 'text-foreground-l2')
  )
</script>

{#if href}
  <a bind:this={ref} {href} class={className} {...restProps}>
    {@render icon({ class: iconClassName })}
  </a>
{:else}
  <button bind:this={ref} {type} class={className} {...restProps}>
    {@render icon({ class: iconClassName })}
  </button>
{/if}
