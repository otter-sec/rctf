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
</script>

{#if !isMinimal}
  <div
    class={cn('fade fade-left-header', showLeft ? 'opacity-100' : 'opacity-0')}
    aria-hidden="true"
  ></div>

  <div
    class={cn('fade fade-right-header', showRight ? 'opacity-100' : 'opacity-0')}
    aria-hidden="true"
  ></div>

  <div
    class={cn('fade fade-top-team', showTop ? 'opacity-100' : 'opacity-0')}
    aria-hidden="true"
  ></div>

  <div
    class={cn('fade fade-bottom-team', showBottom ? 'opacity-100' : 'opacity-0')}
    aria-hidden="true"
  ></div>

  <div
    class={cn('fade fade-top-content', showTop ? 'opacity-100' : 'opacity-0')}
    aria-hidden="true"
  ></div>

  <div
    class={cn('fade fade-bottom-content', showBottom ? 'opacity-100' : 'opacity-0')}
    aria-hidden="true"
  ></div>

  <div
    class={cn('fade fade-left-content', showLeft ? 'opacity-100' : 'opacity-0')}
    aria-hidden="true"
  ></div>

  <div
    class={cn('fade fade-right-content', showRight ? 'opacity-100' : 'opacity-0')}
    aria-hidden="true"
  ></div>

  {#if showSelfRow}
    <div
      class={cn('fade fade-left-self', showLeft ? 'opacity-100' : 'opacity-0')}
      aria-hidden="true"
    ></div>

    <div
      class={cn('fade fade-right-self', showRight ? 'opacity-100' : 'opacity-0')}
      aria-hidden="true"
    ></div>
  {/if}
{:else}
  <div
    class={cn('fade fade-top-minimal', showTop ? 'opacity-100' : 'opacity-0')}
    aria-hidden="true"
  ></div>
  <div
    class={cn('fade fade-bottom-minimal', showBottom ? 'opacity-100' : 'opacity-0')}
    aria-hidden="true"
  ></div>
{/if}

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
