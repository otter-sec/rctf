<script lang="ts">
  import { cn } from '$lib/utils'

  interface Props {
    showTop: boolean
    showBottom: boolean
    showLeft: boolean
    showRight: boolean
    showSelfRow: boolean
    isMinimal: boolean
  }

  let { showTop, showBottom, showLeft, showRight, showSelfRow, isMinimal }: Props = $props()

  type FadeConfig = { class: string; show: boolean }

  const fades = $derived.by((): FadeConfig[] => {
    if (isMinimal) {
      return [
        { class: 'fade-top-minimal', show: showTop },
        { class: 'fade-bottom-minimal', show: showBottom },
      ]
    }

    const base: FadeConfig[] = [
      { class: 'fade-left-header', show: showLeft },
      { class: 'fade-right-header', show: showRight },
      { class: 'fade-top-team', show: showTop },
      { class: 'fade-bottom-team', show: showBottom },
      { class: 'fade-top-content', show: showTop },
      { class: 'fade-bottom-content', show: showBottom },
      { class: 'fade-left-content', show: showLeft },
      { class: 'fade-right-content', show: showRight },
    ]

    if (showSelfRow) {
      base.push(
        { class: 'fade-left-self', show: showLeft },
        { class: 'fade-right-self', show: showRight }
      )
    }

    return base
  })
</script>

{#each fades as fade}
  <div
    class={cn('fade', fade.class, fade.show ? 'opacity-100' : 'opacity-0')}
    aria-hidden="true"
  ></div>
{/each}

<style>
  .fade {
    --fade-size: 3rem;
    pointer-events: none;
    position: absolute;
    z-index: 40;
    transition: opacity 150ms;
  }

  .fade-left-header {
    top: 0;
    left: var(--team-column-width);
    height: var(--header-height);
    width: var(--fade-size);
    background: linear-gradient(to right, var(--background-l0), transparent);
  }

  .fade-right-header {
    top: 0;
    right: 0;
    height: var(--header-height);
    width: var(--fade-size);
    background: linear-gradient(to left, var(--background-l0), transparent);
  }

  .fade-top-team {
    top: var(--header-height);
    left: 0;
    width: var(--team-column-width);
    height: var(--fade-size);
    background: linear-gradient(to bottom, var(--background-l0), transparent);
  }

  .fade-bottom-team {
    bottom: var(--self-row-offset, 0px);
    left: 0;
    width: var(--team-column-width);
    height: var(--fade-size);
    background: linear-gradient(to top, var(--background-l0), transparent);
  }

  .fade-top-content {
    top: var(--header-height);
    left: var(--team-column-width);
    right: 0;
    height: var(--fade-size);
    background: linear-gradient(to bottom, var(--background-l0), transparent);
  }

  .fade-bottom-content {
    bottom: var(--self-row-offset, 0px);
    left: var(--team-column-width);
    right: 0;
    height: var(--fade-size);
    background: linear-gradient(to top, var(--background-l0), transparent);
  }

  .fade-left-content {
    top: var(--header-height);
    bottom: var(--self-row-offset, 0px);
    left: var(--team-column-width);
    width: var(--fade-size);
    background: linear-gradient(to right, var(--background-l0), transparent);
  }

  .fade-right-content {
    top: var(--header-height);
    bottom: var(--self-row-offset, 0px);
    right: 0;
    width: var(--fade-size);
    background: linear-gradient(to left, var(--background-l0), transparent);
  }

  .fade-left-self {
    bottom: 0;
    left: var(--team-column-width);
    height: var(--self-row-height);
    width: var(--fade-size);
    background: linear-gradient(to right, var(--background-l0), transparent);
  }

  .fade-right-self {
    bottom: 0;
    right: 0;
    height: var(--self-row-height);
    width: var(--fade-size);
    background: linear-gradient(to left, var(--background-l0), transparent);
  }

  .fade-top-minimal {
    top: var(--header-height);
    left: 0;
    right: 0;
    height: var(--fade-size);
    background: linear-gradient(to bottom, var(--background-l0), transparent);
  }

  .fade-bottom-minimal {
    bottom: var(--self-row-offset, 0px);
    left: 0;
    right: 0;
    height: var(--fade-size);
    background: linear-gradient(to top, var(--background-l0), transparent);
  }
</style>
