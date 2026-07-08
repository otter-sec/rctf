<script lang="ts">
  import { IconCaretDown } from '$lib/icons'
  import Menu, { type MenuItem } from '$lib/ui/menu.svelte'
  import { filterOperatorLabel, includeOperatorLabel, type FilterMode } from './core'

  type Props = {
    mode: FilterMode
    count: number
    onSelect: (mode: FilterMode) => void
  }

  let { mode, count, onSelect }: Props = $props()

  const items = $derived<MenuItem[]>([
    {
      value: 'include',
      label: includeOperatorLabel(count),
      checked: mode === 'include',
      onSelect: () => onSelect('include'),
    },
    {
      value: 'exclude',
      label: 'is not',
      checked: mode === 'exclude',
      onSelect: () => onSelect('exclude'),
    },
  ])
</script>

<Menu label="Filter operator" {items}>
  {#snippet trigger({ props })}
    <button {...props} type="button">
      {filterOperatorLabel(mode, count)}
      <IconCaretDown aria-hidden="true" />
    </button>
  {/snippet}
</Menu>

<style>
  button {
    display: flex;
    block-size: 100%;
    align-items: center;
    gap: var(--space-3xs);
    padding-inline: 0.5rem;
    color: var(--foreground-l4);
    background: transparent;
    border: none;
    border-inline-end: 2px solid var(--border);
    font-size: var(--step--1);
    cursor: pointer;

    :global(svg) {
      inline-size: 0.75rem;
      block-size: 0.75rem;
    }

    &:hover,
    &[data-state='open'] {
      color: var(--foreground-l2);
      background: var(--background-l3);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: -2px;
    }
  }
</style>
