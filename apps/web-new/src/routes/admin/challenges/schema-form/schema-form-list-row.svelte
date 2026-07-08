<script lang="ts">
  import { IconX } from '$lib/icons'
  import type { PathStatus } from './types'

  interface Props {
    label: string
    removeLabel: string
    status?: PathStatus | undefined
    mono?: boolean
    disabled?: boolean
    onOpen: () => void
    onRemove: () => void
  }

  let {
    label,
    removeLabel,
    status = undefined,
    mono = false,
    disabled = false,
    onOpen,
    onRemove,
  }: Props = $props()
</script>

<list-row
  data-mono={mono || undefined}
  data-invalid={status === 'invalid' ? '' : undefined}
  data-incomplete={status === 'incomplete' ? '' : undefined}
>
  <button type="button" class="open" data-empty={label.trim() ? undefined : ''} onclick={onOpen}>
    <row-label>
      {label.trim() || '(unnamed)'}
      {#if status === 'invalid'}
        <span data-visually-hidden>contains errors</span>
      {:else if status === 'incomplete'}
        <span data-visually-hidden>incomplete</span>
      {/if}
    </row-label>
    {#if status}
      <row-status
        aria-hidden="true"
        title={status === 'invalid' ? 'Contains errors' : 'Required fields missing'}
      >
        {status === 'invalid' ? '!' : '●'}
      </row-status>
    {/if}
  </button>
  <button type="button" class="remove" aria-label={removeLabel} onclick={onRemove} {disabled}>
    <IconX />
  </button>
</list-row>

<style>
  list-row {
    display: flex;
    align-items: center;
    gap: var(--space-3xs);
    border: 2px solid var(--border);
    border-radius: var(--radius-md);

    &:hover {
      background: var(--background-l3);
    }
  }

  .open {
    display: flex;
    flex: 1;
    align-items: center;
    gap: var(--space-2xs);
    min-inline-size: 0;
    padding: 0.5rem 0.75rem;
    color: var(--foreground-l1);
    font-size: var(--step--1);
    text-align: start;
    cursor: pointer;

    list-row[data-mono] & {
      font-family: var(--font-mono);
    }

    &[data-empty] {
      color: var(--foreground-l5);
      font-style: italic;
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: -2px;
      border-radius: var(--radius-sm);
    }
  }

  row-label {
    flex: 1;
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  row-status {
    flex-shrink: 0;
    font-size: 0.75em;
    line-height: 1;
  }

  list-row[data-invalid] row-status,
  list-row[data-incomplete] row-status {
    color: var(--foreground-destructive);
  }

  .remove {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    margin-inline-end: 0.375rem;
    color: var(--foreground-l4);
    cursor: pointer;
    border-radius: var(--radius-sm);

    &:hover {
      color: var(--foreground-destructive);
      background: var(--background-destructive);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
    }

    :global(svg) {
      inline-size: 0.875rem;
      block-size: 0.875rem;
    }
  }
</style>
