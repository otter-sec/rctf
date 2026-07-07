<script lang="ts">
  import { captureElement } from '$lib/attachments/capture-element'
  import EdgeFades from '$lib/components/edge-fades.svelte'
  import { createScrollGeometry, deriveEdgeFades } from '$lib/components/scroll-geometry.svelte'
  import type { Snippet } from 'svelte'

  interface Props {
    disabled: boolean
    children: Snippet
  }

  let { disabled, children }: Props = $props()

  let scrollRoot = $state<HTMLElement | null>(null)
  const captureScroll = captureElement<HTMLElement>(node => (scrollRoot = node))
  const geometry = createScrollGeometry(() => scrollRoot)
  const fades = deriveEdgeFades(geometry)
</script>

<form-viewport>
  <form-scroll {@attach captureScroll} data-mode={disabled ? 'view' : 'edit'}>
    {@render children()}
  </form-scroll>
  <EdgeFades top={fades.top} bottom={fades.bottom} />
</form-viewport>

<style>
  form-viewport {
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
  }

  form-scroll {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--space-s);
    min-block-size: 0;
    padding: var(--space-s) var(--space-l) var(--space-l);
    overflow-y: auto;

    &[data-mode='view'] {
      opacity: 0.6;
    }
  }
</style>
