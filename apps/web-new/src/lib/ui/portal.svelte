<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    disabled?: boolean
    container?: HTMLElement
    children: Snippet
  }

  let { disabled = false, container, children }: Props = $props()
</script>

{#if disabled}
  {@render children()}
{:else}
  <portal-root
    {@attach (node: HTMLElement) => {
      ;(container ?? document.body).appendChild(node)
      return () => node.remove()
    }}
  >
    {@render children()}
  </portal-root>
{/if}

<style>
  portal-root {
    display: contents;
  }
</style>
