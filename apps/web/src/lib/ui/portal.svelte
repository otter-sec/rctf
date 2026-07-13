<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    children: Snippet
  }

  let { children }: Props = $props()
</script>

<portal-root
  {@attach (node: HTMLElement) => {
    document.body.appendChild(node)
    return () => node.remove()
  }}
>
  {@render children()}
</portal-root>

<style>
  portal-root {
    display: contents;
  }
</style>
