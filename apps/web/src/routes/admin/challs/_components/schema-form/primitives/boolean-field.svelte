<script lang="ts">
  import { Field, Select } from '$lib/components'
  import type { FieldProps } from '../types'
  import { resolveValue } from '../utils'

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
  const resolved = $derived(resolveValue(schema, value) as boolean | undefined)
  const displayValue = $derived(resolved ?? false)

  function set(v: unknown) {
    onChange(path, v)
  }
</script>

<Field.Field>
  {#if showLabel && label}
    <Field.Label>
      {label}{#if required}<span class="text-foreground-destructive -ms-1">*</span>{/if}
      {#if description}
        <Field.Hint>({description})</Field.Hint>
      {/if}
    </Field.Label>
  {/if}

  <Select.Root
    type="single"
    value={String(displayValue)}
    onValueChange={v => set(v === 'true')}
    {disabled}>
    <Select.Trigger class="w-full">{displayValue ? 'Yes' : 'No'}</Select.Trigger>
    <Select.Content>
      <Select.Item value="true" label="Yes">Yes</Select.Item>
      <Select.Item value="false" label="No">No</Select.Item>
    </Select.Content>
  </Select.Root>
</Field.Field>
