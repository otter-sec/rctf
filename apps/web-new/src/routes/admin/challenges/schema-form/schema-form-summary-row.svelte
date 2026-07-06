<script lang="ts">
  import IconChevronRight from '$lib/icons/icon-chevron-right.svelte'
  import type { JsonSchema } from './types'
  import { fieldLabel, getPrimaryType, isRecordSchema } from './utils'

  interface Props {
    schema: JsonSchema
    value: unknown
    path: string[]
    required?: boolean
    isNullable?: boolean
    onNavigate: (path: string[]) => void
  }

  let { schema, value, path, required = false, isNullable = false, onNavigate }: Props = $props()

  const label = $derived(fieldLabel(schema, path))
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

<button type="button" onclick={() => onNavigate(path)}>
  <row-label>{label}{required ? ' *' : ''}</row-label>
  <row-summary>{summary}</row-summary>
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
