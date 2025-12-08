<script lang="ts">
  import Field from './field.svelte'
  import type { FieldProps, JsonSchema } from './types'
  import { defaultValue, getItemLabel } from './utils'

  interface Props extends FieldProps {}

  let { schema, value, path, onChange, disabled = false }: Props = $props()

  const items = $derived((value ?? []) as unknown[])
  const itemSchema = $derived(schema.items ?? ({ type: 'string' } as JsonSchema))
  const label = $derived(schema.title ?? path[path.length - 1] ?? 'Items')

  let selectedIndex = $state(0)

  $effect(() => {
    if (selectedIndex >= items.length) selectedIndex = Math.max(0, items.length - 1)
  })

  function add() {
    onChange(path, [...items, defaultValue(itemSchema)])
    selectedIndex = items.length
  }

  function remove(i: number) {
    onChange(
      path,
      items.filter((_, idx) => idx !== i)
    )
  }
</script>

<fieldset>
  <legend>{label}</legend>

  <div>
    <strong>Items:</strong>
    {#if items.length === 0}
      <p>No items</p>
    {:else}
      <ul>
        {#each items as item, i (i)}
          <li>
            <button type="button" onclick={() => (selectedIndex = i)}>
              {selectedIndex === i ? '>' : ' '}
              {getItemLabel(item, i, label)}
            </button>
            {#if !disabled}
              <button type="button" onclick={() => remove(i)}>×</button>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
    <button type="button" onclick={add} {disabled}>+ Add</button>
  </div>

  <hr />

  <div>
    {#if items[selectedIndex] !== undefined}
      <Field
        schema={itemSchema}
        value={items[selectedIndex]}
        path={[...path, String(selectedIndex)]}
        {onChange}
        {disabled}
        showLabel={false} />
    {:else}
      <p>Add an item to get started</p>
    {/if}
  </div>
</fieldset>
