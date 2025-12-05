<script lang="ts">
  import { Field, Input } from '$lib/components'
  import { getValidationContext } from '../context'
  import type { FieldProps } from '../types'
  import { resolveValue } from '../utils'
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
  const pathKey = $derived(path.join('.'))
  const resolved = $derived(resolveValue(schema, value))

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

  function parseNumber(str: string): number | undefined {
    if (str === '') return undefined
    const num = Number(str)
    if (isNaN(num) || !isFinite(num)) return undefined
    return num
  }

  function handleInput(e: Event) {
    const target = e.currentTarget as HTMLInputElement
    inputValue = target.value

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

<Field.Field data-invalid={!!error || undefined}>
  {#if showLabel && label}
    <Field.Label>
      {label}{#if required}<span class="text-foreground-destructive -ms-1">*</span>{/if}
      {#if description}
        <Field.Hint>({description})</Field.Hint>
      {/if}
    </Field.Label>
  {/if}

  <Input
    type="text"
    inputmode="decimal"
    value={inputValue}
    oninput={handleInput}
    aria-invalid={!!error}
    {disabled} />
  {#if error}
    <Field.Error>{error}</Field.Error>
  {/if}
</Field.Field>
