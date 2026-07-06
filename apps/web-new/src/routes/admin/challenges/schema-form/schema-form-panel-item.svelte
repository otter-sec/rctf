<script lang="ts">
  import IconX from '$lib/icons/icon-x.svelte'

  interface Props {
    label: string
    active: boolean
    removeLabel: string
    mono?: boolean
    disabled?: boolean
    onSelect: () => void
    onRemove: () => void
  }

  let {
    label,
    active,
    removeLabel,
    mono = false,
    disabled = false,
    onSelect,
    onRemove,
  }: Props = $props()
</script>

<panel-item data-active={active || undefined} data-mono={mono || undefined}>
  <button type="button" class="pick" data-empty={label.trim() ? undefined : ''} onclick={onSelect}>
    {label.trim() || '(unnamed)'}
  </button>
  <button type="button" class="remove" aria-label={removeLabel} onclick={onRemove} {disabled}>
    <IconX />
  </button>
</panel-item>

<style>
  panel-item {
    display: flex;
    flex: 1;
    align-items: center;
    gap: var(--space-3xs);
    border-radius: var(--radius-md);

    &[data-active] {
      background: var(--background-l4);
    }

    &:not([data-active]):hover {
      background: var(--background-l3);
    }
  }

  .pick {
    flex: 1;
    min-inline-size: 0;
    overflow: hidden;
    padding: 0.375rem var(--space-2xs);
    color: var(--foreground-l4);
    text-align: start;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;

    panel-item[data-active] & {
      color: var(--foreground-l0);
    }

    panel-item[data-mono] & {
      font-family: var(--font-mono);
    }

    &[data-empty] {
      color: var(--foreground-l5);
      font-style: italic;
    }
  }

  .remove {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    margin-inline-end: 0.25rem;
    color: var(--foreground-l4);
    cursor: pointer;
    border-radius: var(--radius-sm);

    &:hover {
      color: var(--foreground-destructive);
      background: var(--background-destructive);
    }

    :global(svg) {
      inline-size: 0.75rem;
      block-size: 0.75rem;
    }
  }
</style>
