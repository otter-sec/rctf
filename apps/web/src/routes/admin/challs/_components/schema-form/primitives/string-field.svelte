<script lang="ts">
  import { Field, Input, Select, Textarea } from '$lib/components'
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
  const isTextarea = $derived((schema.maxLength ?? 0) > 100 || schema.format === 'textarea')
  const pathKey = $derived(path.join('.'))
  const displayValue = $derived(String(resolveValue(schema, value) ?? ''))

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

    const result = validateValue(schema, newValue)
    setError(result.error)

    onChange(path, newValue)
  }

  function set(v: unknown) {
    onChange(path, v)
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

  {#if schema.enum}
    <Select.Root type="single" value={displayValue} onValueChange={set} {disabled}>
      <Select.Trigger class="w-full">{displayValue || 'Select...'}</Select.Trigger>
      <Select.Content>
        {#each schema.enum as opt}
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
      {disabled} />
  {:else}
    <Input
      type="text"
      value={displayValue}
      oninput={handleInput}
      aria-invalid={!!error}
      {disabled} />
  {/if}
  {#if error}
    <Field.Error>{error}</Field.Error>
  {/if}
</Field.Field>
