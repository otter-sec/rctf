<script lang="ts">
  import { page } from '$app/state'
  import { cn } from '$lib/utils'
  import type { Snippet } from 'svelte'

  type Props = {
    href: string
    activePath?: string
    icon: Snippet<[{ class: string }]>
  }

  let { href, activePath, icon }: Props = $props()

  const isActive = $derived(
    activePath ? page.url.pathname.startsWith(activePath) : false
  )
</script>

<a
  {href}
  class={cn(
    'flex items-center justify-center rounded-lg bg-background-l2 px-4 py-3 hover:bg-background-l3',
    isActive && 'bg-background-accent hover:bg-background-accent-hover'
  )}
>
  {@render icon({
    class: cn('size-6', isActive ? 'text-foreground-accent' : 'text-foreground-l2'),
  })}
</a>
