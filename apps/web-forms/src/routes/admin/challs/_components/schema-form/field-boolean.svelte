<script lang="ts">
  import type { FieldProps } from './types'
  import { resolveValue } from './utils'

  interface Props extends FieldProps {
    showLabel?: boolean
  }

  let {
    schema,
    value,
    path,
    onChange,
    disabled = false,
    showLabel = true,
    required = false,
  }: Props = $props()

  const label = $derived(schema.title ?? path[path.length - 1] ?? '')
  const description = $derived(schema.description)
  const resolved = $derived(resolveValue(schema, value) as boolean | undefined)
  const displayValue = $derived(resolved ?? false)

  function set(v: unknown) {
    onChange(path, v)
  }
</script>

<div>
  {#if showLabel && label}
    <div>
      <strong>{label}</strong>{#if required}*{/if}
      {#if description}
        <small>({description})</small>
      {/if}
    </div>
  {/if}

  <select
    value={String(displayValue)}
    onchange={e => set(e.currentTarget.value === 'true')}
    {disabled}
  >
    <option value="true">Yes</option>
    <option value="false">No</option>
  </select>
</div>
