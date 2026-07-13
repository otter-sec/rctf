<script lang="ts">
  import Field from '$lib/ui/field.svelte'
  import Input from '$lib/ui/input.svelte'
  import Textarea from '$lib/ui/textarea.svelte'
  import SchemaFormSelect from './schema-form-select.svelte'
  import { getSchemaFormErrors, NO_FIELD_ERROR, type FieldProps } from './types'
  import {
    isNullable as checkNullable,
    fieldLabel,
    getEffectiveSchema,
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
  const isTextarea = $derived(
    (schema.maxLength ?? 0) > 100 || schema.format === 'textarea'
  )

  const effectiveSchema = $derived(getEffectiveSchema(schema))
  const enumValues = $derived(effectiveSchema.enum as unknown[] | undefined)
  const isNullable = $derived(checkNullable(schema))
  const displayValue = $derived(
    String(resolveValue(effectiveSchema, value) ?? '')
  )

  const choices = $derived([
    ...(isNullable ? [{ value: null as unknown, label: 'None' }] : []),
    ...(enumValues ?? []).map(option => ({
      value: option,
      label: String(option),
    })),
  ])
  const options = $derived(
    choices.map((choice, index) => ({
      value: String(index),
      label: choice.label,
    }))
  )
  const selected = $derived(
    String(choices.findIndex(choice => choice.value === value))
  )

  const { error, incomplete } = $derived(
    errorsContext?.display(path) ?? NO_FIELD_ERROR
  )

  function handleInput(event: Event) {
    const target = event.currentTarget as HTMLInputElement | HTMLTextAreaElement
    const newValue = target.value
    onChange(path, isNullable && newValue === '' ? null : newValue)
  }

  function set(next: string) {
    const choice = choices[Number(next)]
    if (choice) onChange(path, choice.value)
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
    {#if enumValues}
      <SchemaFormSelect
        {options}
        value={selected}
        onValueChange={set}
        label={label || 'Select'}
        placeholder={isNullable ? 'None' : 'Select...'}
        {disabled}
      />
    {:else if isTextarea}
      <Textarea
        {id}
        aria-describedby={describedBy}
        value={displayValue}
        oninput={handleInput}
        aria-invalid={error && !incomplete ? 'true' : undefined}
        data-incomplete={incomplete ? '' : undefined}
        rows={3}
        placeholder={isNullable ? '(empty for none)' : undefined}
        {disabled}
      />
    {:else}
      <Input
        {id}
        aria-describedby={describedBy}
        type="text"
        value={displayValue}
        oninput={handleInput}
        aria-invalid={error && !incomplete ? 'true' : undefined}
        data-incomplete={incomplete ? '' : undefined}
        placeholder={isNullable ? '(empty for none)' : undefined}
        {disabled}
      />
    {/if}
  {/snippet}
</Field>
