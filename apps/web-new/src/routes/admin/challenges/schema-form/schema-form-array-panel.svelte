<script lang="ts">
  import Button from '$lib/ui/button.svelte'
  import SchemaFormField from './schema-form-field.svelte'
  import SchemaFormPanelItem from './schema-form-panel-item.svelte'
  import SchemaFormPanelLayout from './schema-form-panel-layout.svelte'
  import type { FieldProps, JsonSchema } from './types'
  import { defaultValue, getItemLabel } from './utils'

  interface Props extends FieldProps {}

  let { schema, value, path, onChange, onError, disabled = false }: Props = $props()

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

  function remove(index: number) {
    onChange(
      path,
      items.filter((_, i) => i !== index)
    )
  }
</script>

<SchemaFormPanelLayout label={label as string}>
  {#snippet sidebar()}
    {#if items.length === 0}
      <panel-empty>No items</panel-empty>
    {:else}
      {#each items as item, i (i)}
        <SchemaFormPanelItem
          label={getItemLabel(item, i, label as string)}
          active={selectedIndex === i}
          removeLabel="Remove item"
          {disabled}
          onSelect={() => (selectedIndex = i)}
          onRemove={() => remove(i)}
        />
      {/each}
    {/if}
  {/snippet}

  {#snippet footer()}
    <Button size="sm" onclick={add} {disabled}>Add</Button>
  {/snippet}

  {#snippet content()}
    {#if items[selectedIndex] !== undefined}
      <SchemaFormField
        schema={itemSchema}
        value={items[selectedIndex]}
        path={[...path, String(selectedIndex)]}
        {onChange}
        {onError}
        {disabled}
        showLabel={false}
      />
    {:else}
      <panel-placeholder>Add an item to get started</panel-placeholder>
    {/if}
  {/snippet}
</SchemaFormPanelLayout>

<style>
  panel-empty {
    display: block;
    padding: 0.375rem var(--space-2xs);
    color: var(--foreground-l4);
    font-size: var(--step--1);
  }

  panel-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    block-size: 100%;
    color: var(--foreground-l4);
    font-size: var(--step--1);
  }
</style>
