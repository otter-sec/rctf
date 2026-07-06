<script lang="ts">
  type Props = {
    top: boolean
    bottom: boolean
    selfEdge?: 'top' | 'bottom' | null
  }

  let { top, bottom, selfEdge = null }: Props = $props()
</script>

<edge-fades data-self-edge={selfEdge ?? undefined}>
  <edge-fade data-edge="top" data-visible={top || undefined} aria-hidden="true"></edge-fade>
  <edge-fade data-edge="bottom" data-visible={bottom || undefined} aria-hidden="true"></edge-fade>
</edge-fades>

<style>
  edge-fades {
    display: contents;

    --fade-inset-top: 0px;
    --fade-inset-bottom: 0px;

    &[data-self-edge='top'] {
      --fade-inset-top: calc(5rem + var(--space-3xs));
    }

    &[data-self-edge='bottom'] {
      --fade-inset-bottom: calc(4rem + var(--space-3xs));
    }
  }

  edge-fade {
    position: absolute;
    inset-inline: 0;
    z-index: 1;
    display: block;
    block-size: 1.5rem;
    pointer-events: none;
    opacity: 0;
    transition: opacity 150ms ease;

    &[data-visible] {
      opacity: 1;
    }

    &[data-edge='top'] {
      inset-block-start: var(--fade-inset-top);
      background: linear-gradient(to bottom, var(--background-l2), transparent);
    }

    &[data-edge='bottom'] {
      inset-block-end: var(--fade-inset-bottom);
      background: linear-gradient(to top, var(--background-l2), transparent);
    }
  }
</style>
