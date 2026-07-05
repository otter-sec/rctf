<!--
  Hover/focus-revealed pin toggles for the scoreboard graph. State lives in the
  route's URL/preferences layer, so these are value + callback props (not
  bindable); the component only reflects state via data-active and aria-pressed.
-->
<script lang="ts">
  import { mergeProps } from '@zag-js/svelte'
  import IconMoodHappyFilled from '$lib/icons/icon-mood-happy-filled.svelte'
  import IconPinFilled from '$lib/icons/icon-pin-filled.svelte'
  import Tooltip from '$lib/ui/tooltip.svelte'

  interface Props {
    showTop3Context: boolean
    showSelfContext: boolean
    onToggleTop3: () => void
    onToggleSelf: () => void
  }

  let { showTop3Context, showSelfContext, onToggleTop3, onToggleSelf }: Props = $props()
</script>

<graph-controls>
  <Tooltip label="Pin top 3 to graph">
    {#snippet children({ props })}
      <button
        {...mergeProps(props, { onclick: onToggleTop3 })}
        type="button"
        aria-label="Pin top 3 to graph"
        aria-pressed={showTop3Context}
        data-active={showTop3Context ? '' : undefined}
      >
        <IconPinFilled />
      </button>
    {/snippet}
  </Tooltip>

  <Tooltip label="Pin self to graph">
    {#snippet children({ props })}
      <button
        {...mergeProps(props, { onclick: onToggleSelf })}
        type="button"
        aria-label="Pin self to graph"
        aria-pressed={showSelfContext}
        data-active={showSelfContext ? '' : undefined}
      >
        <IconMoodHappyFilled />
      </button>
    {/snippet}
  </Tooltip>
</graph-controls>

<style>
  graph-controls {
    display: flex;
    gap: var(--space-3xs);
  }

  button {
    display: flex;
    align-items: center;
    justify-content: center;
    inline-size: 1.75rem;
    block-size: 1.75rem;
    padding: 0;
    font-size: 0.875rem;
    color: var(--foreground-l3);
    background: var(--background-l2);
    border: 2px solid var(--border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition:
      color 120ms ease,
      background 120ms ease;

    &:hover {
      color: var(--foreground-l1);
      background: var(--background-l3);
    }

    &[data-active] {
      color: var(--foreground-accent);
      background: var(--background-accent);
    }
  }
</style>
