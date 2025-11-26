<script lang="ts">
  import type { Snippet } from 'svelte'
  import { page } from '$app/state'
  import { buttonVariants } from '$lib/components'
  import { cn } from '$lib/utils'

  let { href, children }: { href: string; children: Snippet } = $props()
  const isActive = $derived(page.url.pathname === href)
</script>

<a
  {href}
  aria-current={isActive ? 'page' : undefined}
  class={cn(
    buttonVariants({ variant: 'ghost', size: 'sm' }),
    isActive && 'bg-background-l2'
  )}
>
  {@render children()}
</a>
