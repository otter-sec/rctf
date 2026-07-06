<script lang="ts">
  import Field from '$lib/ui/field.svelte'
  import Input from '$lib/ui/input.svelte'
  import type { FieldProps } from './types'
  import { isNullable as checkNullable, fieldLabel, parseNumber, resolveValue } from './utils'
  import { validateValue } from './validate'

  interface Props extends FieldProps {
    showLabel?: boolean
  }

  let {
    schema,
    value,
    path,
    onChange,
    onError,
    disabled = false,
    showLabel = true,
    required = false,
  }: Props = $props()

  const label = $derived(fieldLabel(schema, path))
  const description = $derived(schema.description)
  const pathKey = $derived(path.join('.'))
  const resolved = $derived(resolveValue(schema, value))
  const isNullable = $derived(checkNullable(schema))
  const displayValue = $derived(resolved !== undefined && resolved !== null ? String(resolved) : '')

  let inputValue = $derived(displayValue)
  let error = $state<string | null>(null)

  $effect(() => {
    const key = pathKey
    return () => onError?.(key, null)
  })

  function setError(newError: string | null) {
    error = newError
    onError?.(pathKey, newError)
  }

  function handleInput(event: Event) {
    inputValue = (event.currentTarget as HTMLInputElement).value

    if (inputValue === '' && isNullable) {
      setError(null)
      onChange(path, null)
      return
    }

    const num = parseNumber(inputValue)
    if (num === undefined && inputValue !== '') {
      setError('Must be a valid number')
      return
    }

    const result = validateValue(schema, num)
    setError(result.error)

    if (result.valid) {
      onChange(path, num)
    }
  }
</script>

<Field
  label={showLabel && label ? `${label}${required ? ' *' : ''}` : undefined}
  description={showLabel ? description : undefined}
  {error}
>
  {#snippet children({ id, describedBy })}
    <Input
      {id}
      aria-describedby={describedBy}
      type="text"
      inputmode="decimal"
      value={inputValue}
      oninput={handleInput}
      aria-invalid={error ? 'true' : undefined}
      placeholder={isNullable ? '(empty for none)' : undefined}
      {disabled}
    />
  {/snippet}
</Field>
