<script lang="ts">
  import Checkbox from '$lib/ui/checkbox.svelte'
  import Field from '$lib/ui/field.svelte'
  import type { FieldProps } from './types'
  import { fieldLabel, resolveValue } from './utils'

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

  const label = $derived(fieldLabel(schema, path))
  const description = $derived(schema.description)
  const resolved = $derived(resolveValue(schema, value) as boolean | undefined)
  const displayValue = $derived(resolved ?? false)
</script>

<Field
  label={showLabel && label ? `${label}${required ? ' *' : ''}` : undefined}
  description={showLabel ? description : undefined}
>
  {#snippet children({ id, describedBy })}
    <Checkbox
      {id}
      aria-describedby={describedBy}
      checked={displayValue}
      onchange={event => onChange(path, event.currentTarget.checked)}
      {disabled}
    />
  {/snippet}
</Field>
