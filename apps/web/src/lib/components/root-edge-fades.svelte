<root-edge-fades aria-hidden="true">
  <root-fade data-edge="top"></root-fade>
  <root-fade data-edge="bottom"></root-fade>
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

    &[data-edge='top'] {
      inset-block-start: var(--header-height);
      background: linear-gradient(to bottom, var(--background-l0), transparent);
    }

    &[data-edge='bottom'] {
      inset-block-end: 0;
      background: linear-gradient(to top, var(--background-l0), transparent);
    }

    @supports (animation-timeline: scroll()) {
      animation: linear both;
      animation-timeline: scroll(root);

      &[data-edge='top'] {
        animation-name: root-fade-in;
        animation-range: 0 1.5rem;
      }

      &[data-edge='bottom'] {
        animation-name: root-fade-out;
        animation-range: calc(100% - 1.5rem) 100%;
      }
    }
  }

  @keyframes root-fade-in {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  @keyframes root-fade-out {
    from {
      opacity: 1;
    }

    to {
      opacity: 0;
    }
  }
</style>
