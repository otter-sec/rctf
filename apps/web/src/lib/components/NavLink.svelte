<script lang="ts">
  import { page } from '$app/state'
  import type { Snippet } from 'svelte'
  import { buttonVariants } from '$lib/components/ui/button'
  import { cn } from '$lib/utils'

  let { href, children }: { href: string; children: Snippet } = $props()
  const isActive = $derived(page.url.pathname === href)
</script>

<a
  {href}
  aria-current={isActive ? 'page' : undefined}
  class={cn(
    buttonVariants({ variant: 'ghost', size: 'sm' }),
    isActive && 'bg-muted'
  )}
>
  {@render children()}
</a>
