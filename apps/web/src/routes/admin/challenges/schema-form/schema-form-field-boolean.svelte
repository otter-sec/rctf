<script lang="ts">
  import Field from '$lib/ui/field.svelte'
  import SchemaFormSelect from './schema-form-select.svelte'
  import { getSchemaFormErrors, NO_FIELD_ERROR, type FieldProps } from './types'
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

  const errorsContext = getSchemaFormErrors()

  const label = $derived(fieldLabel(schema, path))
  const description = $derived(schema.description)
  const resolved = $derived(resolveValue(schema, value) as boolean | undefined)
  const displayValue = $derived(resolved ?? false)

  const { error, incomplete } = $derived(errorsContext?.display(path) ?? NO_FIELD_ERROR)
</script>

<Field
  label={showLabel && label ? label : undefined}
  required={showLabel && required}
  hint={showLabel ? description : undefined}
  {error}
  {incomplete}
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
