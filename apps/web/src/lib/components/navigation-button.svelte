<script lang="ts">
  import { page } from '$app/state'
  import { cn } from '$lib/utils'
  import type { Snippet } from 'svelte'

  interface Props {
    href: string
    activePath?: string
    icon: Snippet<[{ class: string }]>
  }

  let { href, activePath, icon }: Props = $props()

  const isActive = $derived(activePath ? page.url.pathname.startsWith(activePath) : false)
</script>

<a
  {href}
  class={cn(
    'bg-background-l2 hover:bg-background-l3 flex items-center justify-center rounded-lg px-4 py-3',
    isActive && 'bg-background-accent hover:bg-background-accent-hover'
  )}
>
  {@render icon({
    class: cn('size-6', isActive ? 'text-foreground-accent' : 'text-foreground-l2'),
  })}
</a>
