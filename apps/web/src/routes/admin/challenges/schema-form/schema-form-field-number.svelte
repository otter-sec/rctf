<script lang="ts">
  import Field from '$lib/ui/field.svelte'
  import Input from '$lib/ui/input.svelte'
  import { getSchemaFormErrors, NO_FIELD_ERROR, type FieldProps } from './types'
  import {
    isNullable as checkNullable,
    fieldLabel,
    parseNumber,
    resolveValue,
  } from './utils'

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
  const resolved = $derived(resolveValue(schema, value))
  const isNullable = $derived(checkNullable(schema))
  const displayValue = $derived(
    resolved !== undefined && resolved !== null ? String(resolved) : ''
  )

  let inputValue = $derived(displayValue)

  const { error, incomplete } = $derived(
    errorsContext?.display(path) ?? NO_FIELD_ERROR
  )

  function handleInput(event: Event) {
    inputValue = (event.currentTarget as HTMLInputElement).value

    if (inputValue === '') {
      onChange(path, isNullable ? null : undefined)
      return
    }

    const num = parseNumber(inputValue)
    onChange(path, num ?? inputValue)
  }
</script>

<Field
  label={showLabel && label ? label : undefined}
  required={showLabel && required}
  hint={showLabel ? description : undefined}
  {error}
  {incomplete}
>
  {#snippet children({ id, describedBy })}
    <Input
      {id}
      aria-describedby={describedBy}
      type="text"
      inputmode="decimal"
      value={inputValue}
      oninput={handleInput}
      aria-invalid={error && !incomplete ? 'true' : undefined}
      data-incomplete={incomplete ? '' : undefined}
      placeholder={isNullable ? '(empty for none)' : undefined}
      {disabled}
    />
  {/snippet}
</Field>
