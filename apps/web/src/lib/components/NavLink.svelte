<script lang="ts">
  import { page } from '$app/state'
  import type { Snippet } from 'svelte'

  let { href, children }: { href: string; children: Snippet } = $props()
  const isActive = $derived(page.url.pathname === href)
</script>

<a
  {href}
  class="border px-3 py-1.5 {isActive ? 'border-2' : ''}"
  aria-current={isActive ? 'page' : undefined}
>
  {@render children()}
</a>
