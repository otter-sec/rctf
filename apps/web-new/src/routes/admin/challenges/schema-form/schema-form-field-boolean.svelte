<script lang="ts">
  import Field from '$lib/ui/field.svelte'
  import SchemaFormSelect from './schema-form-select.svelte'
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
  hint={showLabel ? description : undefined}
>
  {#snippet children()}
    <SchemaFormSelect
      options={[
        { value: 'true', label: 'true' },
        { value: 'false', label: 'false' },
      ]}
      value={displayValue ? 'true' : 'false'}
      onValueChange={v => onChange(path, v === 'true')}
      {label}
      {disabled}
    />
  {/snippet}
</Field>
