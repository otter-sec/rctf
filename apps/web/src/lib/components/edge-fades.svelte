<script lang="ts">
  type Props = {
    selfEdge?: 'top' | 'bottom' | null
  }

  let { selfEdge = null }: Props = $props()
</script>

<edge-fades data-self-edge={selfEdge ?? undefined}>
  <edge-fade data-edge="top" aria-hidden="true"></edge-fade>
  <edge-fade data-edge="bottom" aria-hidden="true"></edge-fade>
</edge-fades>

<style>
  edge-fades {
    display: contents;

    --fade-inset-top: 0px;
    --fade-inset-bottom: 0px;

    &[data-self-edge='top'] {
      --fade-inset-top: var(
        --fade-self-inset-top,
        calc(5rem + var(--space-3xs))
      );
    }

    &[data-self-edge='bottom'] {
      --fade-inset-bottom: var(
        --fade-self-inset-bottom,
        calc(4rem + var(--space-3xs))
      );
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

    &[data-edge='top'] {
      inset-block-start: var(--fade-inset-top);
      background: linear-gradient(
        to bottom,
        var(--fade-color, var(--background-l2)),
        transparent
      );
    }

    &[data-edge='bottom'] {
      inset-block-end: var(--fade-inset-bottom);
      background: linear-gradient(
        to top,
        var(--fade-color, var(--background-l2)),
        transparent
      );
    }

    @supports (animation-timeline: scroll()) {
      animation: linear both;
      animation-timeline: --edge-fade;

      &[data-edge='top'] {
        animation-name: edge-fade-in;
        animation-range: 0 1.5rem;
      }

      &[data-edge='bottom'] {
        animation-name: edge-fade-out;
        animation-range: calc(100% - 1.5rem) 100%;
      }
    }
  }

  @keyframes edge-fade-in {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  @keyframes edge-fade-out {
    from {
      opacity: 1;
    }

    to {
      opacity: 0;
    }
  }
</style>
