<script lang="ts">
  import type { FieldProps, JsonSchema } from './types'
  import { validateValue } from './validate'

  interface Props extends FieldProps {}

  let { schema, value, path, onChange, disabled = false }: Props = $props()

  const items = $derived((value ?? []) as unknown[])
  const itemSchema = $derived(schema.items ?? ({ type: 'string' } as JsonSchema))
  const label = $derived(schema.title ?? path[path.length - 1] ?? 'Items')
  const description = $derived(schema.description)
  const isNumeric = $derived(itemSchema.type === 'number' || itemSchema.type === 'integer')
  const enumValues = $derived(itemSchema.enum as string[] | undefined)

  let inputValue = $state('')

  function validate(v: string): boolean {
    if (isNumeric) {
      const num = Number(v)
      if (isNaN(num) || !isFinite(num)) return false
      return validateValue(itemSchema, num).valid
    }
    return validateValue(itemSchema, v).valid
  }

  function addItem() {
    if (!inputValue.trim()) return
    if (!validate(inputValue)) return

    const newValue = isNumeric ? Number(inputValue) : inputValue
    onChange(path, [...items, newValue])
    inputValue = ''
  }

  function removeItem(index: number) {
    onChange(
      path,
      items.filter((_, i) => i !== index)
    )
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addItem()
    }
  }

  function handleSelectChange(e: Event) {
    const target = e.currentTarget as HTMLSelectElement
    const selectedValue = target.value
    if (selectedValue && !items.includes(selectedValue)) {
      onChange(path, [...items, selectedValue])
    }
    target.value = ''
  }
</script>

<div>
  <div>
    <strong>{label}</strong>
    {#if description}
      <small>({description})</small>
    {/if}
  </div>

  <div>
    {#each items as item, i}
      <span>[{item}]</span>
      {#if !disabled}
        <button type="button" onclick={() => removeItem(i)}>×</button>
      {/if}
    {/each}
  </div>

  {#if enumValues}
    <select onchange={handleSelectChange} {disabled}>
      <option value="">Add...</option>
      {#each enumValues as opt}
        {#if !items.includes(opt)}
          <option value={String(opt)}>{opt}</option>
        {/if}
      {/each}
    </select>
  {:else}
    <div>
      <input
        type="text"
        bind:value={inputValue}
        onkeydown={handleKeyDown}
        placeholder="Type and press Enter"
        {disabled} />
      <button type="button" onclick={addItem} disabled={disabled || !inputValue.trim()}>Add</button>
    </div>
  {/if}
</div>
