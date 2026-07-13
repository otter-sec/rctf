<script lang="ts">
  import { mergeProps } from '@zag-js/svelte'
  import { IconPushPin, IconSmiley } from '$lib/icons'
  import Tooltip from '$lib/ui/tooltip.svelte'

  interface Props {
    pinTop3?: boolean
    pinSelf?: boolean
  }

  let { pinTop3 = $bindable(true), pinSelf = $bindable(true) }: Props = $props()
</script>

<graph-controls>
  <Tooltip label="Pin top 3 to graph">
    {#snippet children({ props })}
      <button
        {...mergeProps(props, { onclick: () => (pinTop3 = !pinTop3) })}
        type="button"
        aria-label="Pin top 3 to graph"
        aria-pressed={pinTop3}
        data-active={pinTop3 ? '' : undefined}
      >
        <IconPushPin />
      </button>
    {/snippet}
  </Tooltip>

  <Tooltip label="Pin self to graph">
    {#snippet children({ props })}
      <button
        {...mergeProps(props, { onclick: () => (pinSelf = !pinSelf) })}
        type="button"
        aria-label="Pin self to graph"
        aria-pressed={pinSelf}
        data-active={pinSelf ? '' : undefined}
      >
        <IconSmiley />
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
