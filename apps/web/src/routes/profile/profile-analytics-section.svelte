<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    title: string
    children: Snippet
    last?: boolean
  }

  let { title, children, last = false }: Props = $props()
</script>

<section class={last ? 'px-4 py-4' : 'border-border/50 border-b px-4 py-4'}>
  <div class="mb-3">
    <h2 class="text-foreground-l1 text-sm">{title}</h2>
  </div>
  {@render children()}
</section>
