<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    title: string
    children: Snippet
  }

  let { title, children }: Props = $props()
</script>

<section class="border-border/50 border-b px-4 py-4 last:border-b-0">
  <div class="mb-3">
    <h2 class="text-foreground-l1 text-sm">{title}</h2>
  </div>
  {@render children()}
</section>
