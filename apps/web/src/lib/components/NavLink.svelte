<script lang="ts">
  import { page } from '$app/state'
  import type { Snippet } from 'svelte'

  let { href, children }: { href: string; children: Snippet } = $props()
  const isActive = $derived(page.url.pathname === href)
</script>

<a {href} aria-current={isActive ? 'page' : undefined}>
  {@render children()}
</a>
