<script lang="ts">
  import { IconChevronRight } from '$lib/icons'
  import { getSchemaFormErrors, type JsonSchema } from './types'
  import { collectionSummary, fieldLabel } from './utils'

  interface Props {
    schema: JsonSchema
    value: unknown
    path: string[]
    required?: boolean
    isNullable?: boolean
    onSelect: (path: string[]) => void
  }

  let { schema, value, path, required = false, isNullable = false, onSelect }: Props = $props()

  const errorsContext = getSchemaFormErrors()

  const label = $derived(fieldLabel(schema, path))
  const status = $derived(errorsContext?.status(path))
  const summary = $derived.by(() => {
    const collection = collectionSummary(schema, value)
    if (collection !== null) return collection
    if (isNullable) {
      return value === null || value === undefined ? 'Not configured' : 'Configured'
    }
    return ''
  })
</script>

<button
  type="button"
  data-invalid={status === 'invalid' ? '' : undefined}
  data-incomplete={status === 'incomplete' ? '' : undefined}
  onclick={() => onSelect(path)}
>
  <row-label>
    {label}{#if required}<row-required aria-hidden="true">*</row-required>{/if}
    {#if status === 'invalid'}
      <span data-visually-hidden>contains errors</span>
    {:else if status === 'incomplete'}
      <span data-visually-hidden>incomplete</span>
    {/if}
  </row-label>
  <row-summary>{summary}</row-summary>
  {#if status}
    <row-status
      aria-hidden="true"
      title={status === 'invalid' ? 'Contains errors' : 'Required fields missing'}
    >
      {status === 'invalid' ? '!' : '●'}
    </row-status>
  {/if}
  <row-chevron aria-hidden="true"><IconChevronRight /></row-chevron>
</button>

<style>
  button {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    inline-size: 100%;
    padding: 0.5rem 0.75rem;
    text-align: start;
    cursor: pointer;
    border: 2px solid var(--border);
    border-radius: var(--radius-md);

    &:hover {
      background: var(--background-l3);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
    }
  }

  row-label {
    flex: 1;
    min-inline-size: 0;
    overflow: hidden;
    color: var(--foreground-l1);
    font-size: var(--step--1);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  row-required {
    margin-inline-start: 0.125rem;
    color: var(--foreground-destructive);
  }

  row-summary {
    flex-shrink: 0;
    color: var(--foreground-l4);
    font-size: var(--step--1);
  }

  row-status {
    flex-shrink: 0;
    font-size: 0.75em;
    line-height: 1;
  }

  button[data-invalid] row-status,
  button[data-incomplete] row-status {
    color: var(--foreground-destructive);
  }

  row-chevron {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    color: var(--foreground-l4);

    :global(svg) {
      inline-size: 0.875rem;
      block-size: 0.875rem;
    }
  }
</style>
