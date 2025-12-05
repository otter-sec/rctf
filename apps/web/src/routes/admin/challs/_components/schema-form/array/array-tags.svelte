<script lang="ts">
  import { Field, Select } from '$lib/components'
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
  const enumValues = $derived(itemSchema.enum as string[] | undefined)

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

  function handleMultiSelectChange(selected: string[]) {
    onChange(path, selected)
  }

  function removeItem(item: string) {
    onChange(
      path,
      items.filter(i => i !== item)
    )
  }
</script>

<Field.Field>
  <Field.Label>
    {label}
    {#if description}
      <Field.Hint>({description})</Field.Hint>
    {/if}
  </Field.Label>

  {#if enumValues}
    <Select.Root
      type="multiple"
      value={items.map(String)}
      onValueChange={handleMultiSelectChange}
      {disabled}>
      <Select.Trigger class="w-full px-2 py-1">
        {#if items.length === 0}
          <span class="text-foreground-l4">Select...</span>
        {:else}
          <div class="flex flex-wrap gap-1">
            {#each items as item}
              <span
                class="inline-flex items-center gap-1 rounded bg-background-l5 px-1.5 py-0.5 text-sm font-mono">
                {item}
                <button
                  type="button"
                  class="hover:text-foreground-destructive"
                  onclick={e => {
                    e.stopPropagation()
                    removeItem(String(item))
                  }}>
                  ×
                </button>
              </span>
            {/each}
          </div>
        {/if}
      </Select.Trigger>
      <Select.Content class="max-h-60 overflow-y-auto">
        {#each enumValues as opt}
          <Select.Item value={String(opt)} label={String(opt)}>
            <span class="font-mono">{opt}</span>
          </Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  {:else}
    <TagInput value={items.map(String)} onchange={handleTagChange} {validate} {disabled} />
  {/if}
</Field.Field>
