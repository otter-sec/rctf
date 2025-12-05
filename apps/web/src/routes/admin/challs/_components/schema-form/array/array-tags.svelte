<script lang="ts">
  import { Field } from '$lib/components'
  import { TagInput } from '$lib/components/ui/tag-input'
  import type { FieldProps, JsonSchema } from '../types'
  import { validateValue } from '../validate'

  interface Props extends FieldProps {}

  let { schema, value, path, onChange, disabled = false }: Props = $props()

  const items = $derived((value ?? []) as unknown[])
  const itemSchema = $derived(schema.items ?? ({ type: 'string' } as JsonSchema))
  const label = $derived(schema.title ?? path[path.length - 1] ?? 'Items')
  const description = $derived(schema.description)
  const isNumeric = $derived(itemSchema.type === 'number' || itemSchema.type === 'integer')

  function validate(v: string): boolean {
    if (isNumeric) {
      const num = Number(v)
      if (isNaN(num) || !isFinite(num)) return false
      return validateValue(itemSchema, num).valid
    }
    return validateValue(itemSchema, v).valid
  }

  function handleTagChange(newItems: string[]) {
    const converted = isNumeric ? newItems.map(v => Number(v)) : newItems
    onChange(path, converted)
  }
</script>

<Field.Field>
  <Field.Label>
    {label}
    {#if description}
      <Field.Hint>({description})</Field.Hint>
    {/if}
  </Field.Label>
  <TagInput value={items.map(String)} onchange={handleTagChange} {validate} {disabled} />
</Field.Field>
