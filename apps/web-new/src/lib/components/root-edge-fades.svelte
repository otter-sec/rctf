<script lang="ts">
  import {
    createWindowScrollGeometry,
    deriveEdgeFades,
  } from '$lib/components/scroll-geometry.svelte'

  const fades = deriveEdgeFades(createWindowScrollGeometry())
</script>

<root-edge-fades aria-hidden="true">
  <root-fade data-edge="top" data-visible={fades.top || undefined}></root-fade>
  <root-fade data-edge="bottom" data-visible={fades.bottom || undefined}></root-fade>
</root-edge-fades>

<style>
  root-edge-fades {
    display: contents;
  }

  root-fade {
    position: fixed;
    inset-inline: 0;
    z-index: 0;
    display: block;
    block-size: 1.5rem;
    pointer-events: none;
    opacity: 0;
    transition: opacity 150ms ease;

    &[data-visible] {
      opacity: 1;
    }

    &[data-edge='top'] {
      inset-block-start: var(--header-height);
      background: linear-gradient(to bottom, var(--background-l0), transparent);
    }

    &[data-edge='bottom'] {
      inset-block-end: 0;
      background: linear-gradient(to top, var(--background-l0), transparent);
    }
  }
</style>
