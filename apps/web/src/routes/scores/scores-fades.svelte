<script lang="ts">
  interface Props {
    showTop: boolean
    showBottom: boolean
    showLeft: boolean
    showRight: boolean
    showSelfRow: boolean
    selfRowPosition?: 'top' | 'bottom'
  }

  let {
    showTop,
    showBottom,
    showLeft,
    showRight,
    showSelfRow,
    selfRowPosition = 'bottom',
  }: Props = $props()

  const selfTop = $derived(showSelfRow && selfRowPosition === 'top')

  type FadeConfig = { kind: string; show: boolean }

  const fades = $derived.by((): FadeConfig[] => {
    const base: FadeConfig[] = [
      { kind: 'left-header', show: showLeft },
      { kind: 'right-header', show: showRight },
      { kind: 'top-team', show: showTop },
      { kind: 'bottom-team', show: showBottom },
      { kind: 'top-content', show: showTop },
      { kind: 'bottom-content', show: showBottom },
      { kind: 'left-content', show: showLeft },
      { kind: 'right-content', show: showRight },
      { kind: 'top-minimal', show: showTop },
      { kind: 'bottom-minimal', show: showBottom },
    ]

    if (showSelfRow) {
      base.push(
        {
          kind: selfTop ? 'left-self-top' : 'left-self',
          show: showLeft,
        },
        {
          kind: selfTop ? 'right-self-top' : 'right-self',
          show: showRight,
        }
      )
    }

    return base
  })
</script>

{#each fades as fade (fade.kind)}
  <scroll-fade kind={fade.kind} show={fade.show || undefined} aria-hidden="true"></scroll-fade>
{/each}

<style>
  scroll-fade {
    --fade-size: calc(var(--spacing) * 12);
    display: block;
    pointer-events: none;
    position: absolute;
    z-index: 40;
    opacity: 0;
    transition: opacity 150ms;

    &[show] {
      opacity: 1;
    }

    &[kind='left-header'],
    &[kind='right-header'],
    &[kind='top-team'],
    &[kind='bottom-team'],
    &[kind='top-content'],
    &[kind='bottom-content'],
    &[kind='left-content'],
    &[kind='right-content'],
    &[kind='left-self'],
    &[kind='right-self'],
    &[kind='left-self-top'],
    &[kind='right-self-top'] {
      display: none;
    }

    &[kind='top-minimal'],
    &[kind='bottom-minimal'] {
      display: block;
    }

    @media (width >= 48rem) {
      &[kind='left-header'],
      &[kind='right-header'],
      &[kind='top-team'],
      &[kind='bottom-team'],
      &[kind='top-content'],
      &[kind='bottom-content'],
      &[kind='left-content'],
      &[kind='right-content'],
      &[kind='left-self'],
      &[kind='right-self'],
      &[kind='left-self-top'],
      &[kind='right-self-top'] {
        display: block;
      }

      &[kind='top-minimal'],
      &[kind='bottom-minimal'] {
        display: none;
      }
    }
  }

  scroll-fade[kind='left-header'] {
    inset-block-start: 0;
    inset-inline-start: var(--score-team-column-width);
    height: var(--score-header-height);
    width: var(--fade-size);
    background: linear-gradient(to right, var(--background-l0), transparent);
  }

  scroll-fade[kind='right-header'] {
    inset-block-start: 0;
    inset-inline-end: 0;
    height: var(--score-header-height);
    width: var(--fade-size);
    background: linear-gradient(to left, var(--background-l0), transparent);
  }

  scroll-fade[kind='top-team'] {
    inset-block-start: calc(var(--score-header-height) + var(--score-self-row-top-offset, 0px));
    inset-inline-start: 0;
    width: var(--score-team-column-width);
    height: var(--fade-size);
    background: linear-gradient(to bottom, var(--background-l0), transparent);
  }

  scroll-fade[kind='bottom-team'] {
    inset-block-end: var(--score-self-row-offset, 0px);
    inset-inline-start: 0;
    width: var(--score-team-column-width);
    height: var(--fade-size);
    background: linear-gradient(to top, var(--background-l0), transparent);
  }

  scroll-fade[kind='top-content'] {
    inset-block-start: calc(var(--score-header-height) + var(--score-self-row-top-offset, 0px));
    inset-inline-start: var(--score-team-column-width);
    inset-inline-end: 0;
    height: var(--fade-size);
    background: linear-gradient(to bottom, var(--background-l0), transparent);
  }

  scroll-fade[kind='bottom-content'] {
    inset-block-end: var(--score-self-row-offset, 0px);
    inset-inline-start: var(--score-team-column-width);
    inset-inline-end: 0;
    height: var(--fade-size);
    background: linear-gradient(to top, var(--background-l0), transparent);
  }

  scroll-fade[kind='left-content'] {
    inset-block-start: calc(var(--score-header-height) + var(--score-self-row-top-offset, 0px));
    inset-block-end: var(--score-self-row-offset, 0px);
    inset-inline-start: var(--score-team-column-width);
    width: var(--fade-size);
    background: linear-gradient(to right, var(--background-l0), transparent);
  }

  scroll-fade[kind='right-content'] {
    inset-block-start: calc(var(--score-header-height) + var(--score-self-row-top-offset, 0px));
    inset-block-end: var(--score-self-row-offset, 0px);
    inset-inline-end: 0;
    width: var(--fade-size);
    background: linear-gradient(to left, var(--background-l0), transparent);
  }

  scroll-fade[kind='left-self'] {
    inset-block-end: 0;
    inset-inline-start: var(--score-team-column-width);
    height: var(--score-self-row-height);
    width: var(--fade-size);
    background: linear-gradient(to right, var(--background-l0), transparent);
  }

  scroll-fade[kind='right-self'] {
    inset-block-end: 0;
    inset-inline-end: 0;
    height: var(--score-self-row-height);
    width: var(--fade-size);
    background: linear-gradient(to left, var(--background-l0), transparent);
  }

  scroll-fade[kind='left-self-top'] {
    inset-block-start: var(--score-header-height);
    inset-inline-start: var(--score-team-column-width);
    height: var(--score-self-row-height);
    width: var(--fade-size);
    background: linear-gradient(to right, var(--background-l0), transparent);
  }

  scroll-fade[kind='right-self-top'] {
    inset-block-start: var(--score-header-height);
    inset-inline-end: 0;
    height: var(--score-self-row-height);
    width: var(--fade-size);
    background: linear-gradient(to left, var(--background-l0), transparent);
  }

  scroll-fade[kind='top-minimal'] {
    inset-block-start: calc(var(--score-header-height) + var(--score-self-row-top-offset, 0px));
    inset-inline: 0;
    height: var(--fade-size);
    background: linear-gradient(to bottom, var(--background-l0), transparent);
  }

  scroll-fade[kind='bottom-minimal'] {
    inset-block-end: var(--score-self-row-offset, 0px);
    inset-inline: 0;
    height: var(--fade-size);
    background: linear-gradient(to top, var(--background-l0), transparent);
  }
</style>
