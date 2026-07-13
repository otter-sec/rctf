<script lang="ts">
  import { mergeProps } from '@zag-js/svelte'
  import { IconPushPin, IconSmiley } from '$lib/icons'
  import Tooltip from '$lib/ui/tooltip.svelte'
  import type { Component } from 'svelte'

  interface Props {
    showTop3Context: boolean
    showSelfContext: boolean
    onToggleTop3: () => void
    onToggleSelf: () => void
  }

  let { showTop3Context, showSelfContext, onToggleTop3, onToggleSelf }: Props = $props()
</script>

{#snippet pinToggle(label: string, Icon: Component, active: boolean, onclick: () => void)}
  <Tooltip {label}>
    {#snippet children({ props })}
      <button
        {...mergeProps(props, { onclick })}
        type="button"
        aria-label={label}
        aria-pressed={active}
        data-active={active ? '' : undefined}
      >
        <Icon />
      </button>
    {/snippet}
  </Tooltip>
{/snippet}

<graph-controls>
  {@render pinToggle('Pin top 3 to graph', IconPushPin, showTop3Context, onToggleTop3)}
  {@render pinToggle('Pin self to graph', IconSmiley, showSelfContext, onToggleSelf)}
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
      color: var(--foreground-l0);
      background: var(--background-l4);
      border-color: var(--foreground-l4);
    }
  }
</style>
