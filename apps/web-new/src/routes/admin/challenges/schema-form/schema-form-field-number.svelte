<script lang="ts">
  import Field from '$lib/ui/field.svelte'
  import Input from '$lib/ui/input.svelte'
  import { getContext } from 'svelte'
  import { SCHEMA_FORM_ERRORS_KEY, type FieldProps, type SchemaFormErrorsContext } from './types'
  import { isNullable as checkNullable, fieldLabel, parseNumber, resolveValue } from './utils'

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

  const errorsContext = getContext<SchemaFormErrorsContext | undefined>(SCHEMA_FORM_ERRORS_KEY)

  const label = $derived(fieldLabel(schema, path))
  const description = $derived(schema.description)
  const resolved = $derived(resolveValue(schema, value))
  const isNullable = $derived(checkNullable(schema))
  const displayValue = $derived(resolved !== undefined && resolved !== null ? String(resolved) : '')

  let inputValue = $derived(displayValue)

  const finding = $derived(errorsContext?.get(path) ?? null)
  const error = $derived(finding?.message ?? null)
  const incomplete = $derived(finding?.severity === 'missing')

  function handleInput(event: Event) {
    inputValue = (event.currentTarget as HTMLInputElement).value

    if (inputValue === '') {
      onChange(path, isNullable ? null : undefined)
      return
    }

    // Unparsable input commits the raw string; the central walker flags the type mismatch
    const num = parseNumber(inputValue)
    onChange(path, num ?? inputValue)
  }
</script>

<Field
  label={showLabel && label ? `${label}${required ? ' *' : ''}` : undefined}
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
