<script lang="ts">
  import { getValidationContext } from './context'
  import type { FieldProps } from './types'
  import { isNullable as checkNullable, parseNumber, resolveValue } from './utils'
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
  const pathKey = $derived(path.join('.'))
  const resolved = $derived(resolveValue(schema, value))
  const isNullable = $derived(checkNullable(schema))

  const validationCtx = getValidationContext()

  let inputValue = $state('')
  let error = $state<string | null>(null)
  const displayValue = $derived(resolved !== undefined && resolved !== null ? String(resolved) : '')

  $effect(() => {
    inputValue = displayValue
  })

  $effect(() => {
    const key = pathKey
    return () => validationCtx?.unregisterField(key)
  })

  function setError(newError: string | null) {
    error = newError
    validationCtx?.registerError(pathKey, newError)
  }

  function handleInput(e: Event) {
    const target = e.currentTarget as HTMLInputElement
    inputValue = target.value

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

<div>
  {#if showLabel && label}
    <div>
      <strong>{label}</strong>{#if required}*{/if}
      {#if description}
        <small>({description})</small>
      {/if}
    </div>
  {/if}

  <input
    type="text"
    inputmode="decimal"
    value={inputValue}
    oninput={handleInput}
    placeholder={isNullable ? '(empty for none)' : undefined}
    {disabled}
  />
  {#if error}
    <div><small>{error}</small></div>
  {/if}
</div>
