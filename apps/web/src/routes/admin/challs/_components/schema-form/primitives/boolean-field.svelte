<script lang="ts">
  import { Field, Select } from '$lib/components'
  import type { FieldProps } from '../types'

  interface Props extends FieldProps {
    showLabel?: boolean
  }

  let { schema, value, path, onChange, disabled = false, showLabel = true }: Props = $props()

  const label = $derived(schema.title ?? path[path.length - 1] ?? '')
  const description = $derived(schema.description)

  function set(v: unknown) {
    onChange(path, v)
  }
</script>

<Field.Field>
  {#if showLabel && label}
    <Field.Label>
      {label}
      {#if description}
        <Field.Hint>({description})</Field.Hint>
      {/if}
    </Field.Label>
  {/if}

  <Select.Root
    type="single"
    value={String(value ?? false)}
    onValueChange={v => set(v === 'true')}
    {disabled}>
    <Select.Trigger class="w-full">{value ? 'Yes' : 'No'}</Select.Trigger>
    <Select.Content>
      <Select.Item value="true" label="Yes">Yes</Select.Item>
      <Select.Item value="false" label="No">No</Select.Item>
    </Select.Content>
  </Select.Root>
</Field.Field>
