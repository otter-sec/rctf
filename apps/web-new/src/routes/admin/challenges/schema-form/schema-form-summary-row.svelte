<script lang="ts">
  import IconChevronRight from '$lib/icons/icon-chevron-right.svelte'
  import { getContext } from 'svelte'
  import { SCHEMA_FORM_ERRORS_KEY, type JsonSchema, type SchemaFormErrorsContext } from './types'
  import { fieldLabel, getPrimaryType, isRecordSchema } from './utils'

  interface Props {
    schema: JsonSchema
    value: unknown
    path: string[]
    required?: boolean
    isNullable?: boolean
    onSelect: (path: string[]) => void
  }

  let { schema, value, path, required = false, isNullable = false, onSelect }: Props = $props()

  const errorsContext = getContext<SchemaFormErrorsContext | undefined>(SCHEMA_FORM_ERRORS_KEY)

  const label = $derived(fieldLabel(schema, path))
  const status = $derived(errorsContext?.status(path))
  const summary = $derived.by(() => {
    if (isRecordSchema(schema)) {
      const count = value && typeof value === 'object' ? Object.keys(value).length : 0
      return count === 1 ? '1 entry' : `${count} entries`
    }
    if (getPrimaryType(schema) === 'array') {
      const count = Array.isArray(value) ? value.length : 0
      return count === 1 ? '1 item' : `${count} items`
    }
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
    {label}{required ? ' *' : ''}
    {#if status === 'invalid'}
      <span data-visually-hidden>contains errors</span>
    {:else if status === 'incomplete'}
      <span data-visually-hidden>incomplete</span>
    {/if}
  </row-label>
  <row-summary>{summary}</row-summary>
  {#if status}
    <row-status aria-hidden="true">{status === 'invalid' ? '!' : '●'}</row-status>
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
      background: var(--background-l2);
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

  button[data-invalid] row-status {
    color: var(--foreground-destructive);
  }

  button[data-incomplete] row-status {
    color: var(--foreground-l3);
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

  [data-visually-hidden] {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    white-space: nowrap;
    clip-path: inset(50%);
    border: 0;
  }
</style>
