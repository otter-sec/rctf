<script lang="ts">
  import { Field, Input, Select, Textarea } from '$lib/components'
  import type { FieldProps } from '../types'
  import { validateValue } from '../validate'

  interface Props extends FieldProps {
    showLabel?: boolean
  }

  let { schema, value, path, onChange, disabled = false, showLabel = true }: Props = $props()

  const label = $derived(schema.title ?? path[path.length - 1] ?? '')
  const description = $derived(schema.description)
  const isTextarea = $derived((schema.maxLength ?? 0) > 100 || schema.format === 'textarea')

  let error = $state<string | null>(null)

  function handleInput(e: Event) {
    const target = e.currentTarget as HTMLInputElement | HTMLTextAreaElement
    const newValue = target.value

    const result = validateValue(schema, newValue)
    error = result.error

    onChange(path, newValue)
  }

  function set(v: unknown) {
    onChange(path, v)
  }
</script>

<Field.Field data-invalid={!!error || undefined}>
  {#if showLabel && label}
    <Field.Label>
      {label}
      {#if description}
        <Field.Hint>({description})</Field.Hint>
      {/if}
    </Field.Label>
  {/if}

  {#if schema.enum}
    <Select.Root type="single" value={String(value ?? '')} onValueChange={set} {disabled}>
      <Select.Trigger class="w-full">{value ?? 'Select...'}</Select.Trigger>
      <Select.Content>
        {#each schema.enum as opt}
          <Select.Item value={String(opt)} label={String(opt)}>{opt}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  {:else if isTextarea}
    <Textarea
      value={String(value ?? '')}
      placeholder={schema.default ? String(schema.default) : ''}
      oninput={handleInput}
      aria-invalid={!!error}
      rows={3}
      {disabled} />
  {:else}
    <Input
      type="text"
      value={String(value ?? '')}
      placeholder={schema.default ? String(schema.default) : ''}
      oninput={handleInput}
      aria-invalid={!!error}
      {disabled} />
  {/if}
  {#if error}
    <Field.Error>{error}</Field.Error>
  {/if}
</Field.Field>
