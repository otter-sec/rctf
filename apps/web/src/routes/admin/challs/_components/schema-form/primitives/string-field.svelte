<script lang="ts">
  import { Field, Input, Select, Textarea } from '$lib/components'
  import { getValidationContext } from '../context'
  import type { FieldProps } from '../types'
  import {
    isNullable as checkNullable,
    fromNullSentinel,
    getEffectiveSchema,
    NULL_SENTINEL,
    resolveValue,
    toNullSentinel,
  } from '../utils'
  import { validateValue } from '../validate'

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
  const isTextarea = $derived((schema.maxLength ?? 0) > 100 || schema.format === 'textarea')
  const pathKey = $derived(path.join('.'))

  const effectiveSchema = $derived(getEffectiveSchema(schema))
  const enumValues = $derived(effectiveSchema.enum as unknown[] | undefined)
  const isNullable = $derived(checkNullable(schema))
  const displayValue = $derived(String(resolveValue(effectiveSchema, value) ?? ''))

  const validationCtx = getValidationContext()

  let error = $state<string | null>(null)

  $effect(() => {
    const key = pathKey
    return () => validationCtx?.unregisterField(key)
  })

  function setError(newError: string | null) {
    error = newError
    validationCtx?.registerError(pathKey, newError)
  }

  function handleInput(e: Event) {
    const target = e.currentTarget as HTMLInputElement | HTMLTextAreaElement
    const newValue = target.value

    // For nullable fields, empty string means null
    const valueToSet = isNullable && newValue === '' ? null : newValue

    const result = validateValue(schema, valueToSet)
    setError(result.error)

    onChange(path, valueToSet)
  }

  function set(v: unknown) {
    onChange(path, fromNullSentinel(v))
  }
</script>

<Field.Field data-invalid={!!error || undefined}>
  {#if showLabel && label}
    <Field.Label>
      {label}{#if required}<span class="text-foreground-destructive -ms-1">*</span>{/if}
      {#if description}
        <Field.Hint>({description})</Field.Hint>
      {/if}
    </Field.Label>
  {/if}

  {#if enumValues}
    <Select.Root type="single" value={toNullSentinel(value)} onValueChange={set} {disabled}>
      <Select.Trigger class="w-full">
        {value === null ? (isNullable ? 'None' : 'Select...') : displayValue || 'Select...'}
      </Select.Trigger>
      <Select.Content>
        {#if isNullable}
          <Select.Item value={NULL_SENTINEL} label="None">
            <span class="text-foreground-l4">None</span>
          </Select.Item>
        {/if}
        {#each enumValues as opt}
          <Select.Item value={String(opt)} label={String(opt)}>{opt}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  {:else if isTextarea}
    <Textarea
      value={displayValue}
      oninput={handleInput}
      aria-invalid={!!error}
      rows={3}
      placeholder={isNullable ? '(empty for none)' : undefined}
      {disabled} />
  {:else}
    <Input
      type="text"
      value={displayValue}
      oninput={handleInput}
      aria-invalid={!!error}
      placeholder={isNullable ? '(empty for none)' : undefined}
      {disabled} />
  {/if}
  {#if error}
    <Field.Error>{error}</Field.Error>
  {/if}
</Field.Field>
