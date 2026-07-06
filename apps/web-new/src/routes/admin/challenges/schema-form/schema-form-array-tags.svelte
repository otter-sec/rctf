<script lang="ts">
  import Checkbox from '$lib/ui/checkbox.svelte'
  import Field from '$lib/ui/field.svelte'
  import TagInput from '$lib/ui/tag-input.svelte'
  import type { FieldProps, JsonSchema } from './types'
  import { fieldLabel } from './utils'
  import { validateValue } from './validate'

  interface Props extends FieldProps {}

  let { schema, value, path, onChange, disabled = false }: Props = $props()

  const items = $derived((value ?? []) as unknown[])
  const itemSchema = $derived(schema.items ?? ({ type: 'string' } as JsonSchema))
  const label = $derived(fieldLabel(schema, path, 'Items'))
  const description = $derived(schema.description)
  const isNumeric = $derived(itemSchema.type === 'number' || itemSchema.type === 'integer')
  const enumValues = $derived(itemSchema.enum as unknown[] | undefined)
  const selected = $derived(new Set(items.map(String)))

  function validate(entry: string): boolean {
    if (isNumeric) {
      const num = Number(entry)
      if (isNaN(num) || !isFinite(num)) return false
      return validateValue(itemSchema, num).valid
    }
    return validateValue(itemSchema, entry).valid
  }

  function handleTagChange(newItems: string[]) {
    onChange(path, isNumeric ? newItems.map(Number) : newItems)
  }

  function toggle(option: string, checked: boolean) {
    const next = checked
      ? [...items.map(String), option]
      : items.map(String).filter(item => item !== option)
    onChange(path, next)
  }
</script>

<Field {label} hint={description}>
  {#snippet children({ id, describedBy })}
    {#if enumValues}
      <checkbox-group aria-describedby={describedBy}>
        {#each enumValues as option (String(option))}
          <Checkbox
            checked={selected.has(String(option))}
            onchange={event => toggle(String(option), event.currentTarget.checked)}
            {disabled}
          >
            {option}
          </Checkbox>
        {/each}
      </checkbox-group>
    {:else}
      <TagInput
        {id}
        aria-describedby={describedBy}
        value={items.map(String)}
        onchange={handleTagChange}
        {validate}
        {disabled}
      />
    {/if}
  {/snippet}
</Field>

<style>
  checkbox-group {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2xs) var(--space-s);
    padding: var(--space-2xs);
    background: var(--background-l4);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: var(--step--1);
  }
</style>
