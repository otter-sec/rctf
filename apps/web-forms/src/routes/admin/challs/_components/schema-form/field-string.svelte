<script lang="ts">
  import { getValidationContext } from './context'
  import type { FieldProps } from './types'
  import {
    isNullable as checkNullable,
    fromNullSentinel,
    getEffectiveSchema,
    NULL_SENTINEL,
    resolveValue,
    toNullSentinel,
  } from './utils'
  import { validateValue } from './validate'

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

    const valueToSet = isNullable && newValue === '' ? null : newValue

    const result = validateValue(schema, valueToSet)
    setError(result.error)

    onChange(path, valueToSet)
  }

  function set(v: unknown) {
    onChange(path, fromNullSentinel(v))
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

  {#if enumValues}
    <select
      value={toNullSentinel(value)}
      onchange={e => set(e.currentTarget.value === NULL_SENTINEL ? null : e.currentTarget.value)}
      {disabled}
    >
      {#if isNullable}
        <option value={NULL_SENTINEL}>None</option>
      {/if}
      {#each enumValues as opt}
        <option value={String(opt)}>{opt}</option>
      {/each}
    </select>
  {:else if isTextarea}
    <textarea
      value={displayValue}
      oninput={handleInput}
      rows={3}
      placeholder={isNullable ? '(empty for none)' : undefined}
      {disabled}
    ></textarea>
  {:else}
    <input
      type="text"
      value={displayValue}
      oninput={handleInput}
      placeholder={isNullable ? '(empty for none)' : undefined}
      {disabled}
    />
  {/if}
  {#if error}
    <div><small>{error}</small></div>
  {/if}
</div>
