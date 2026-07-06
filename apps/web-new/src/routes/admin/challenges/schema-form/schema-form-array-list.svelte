<script lang="ts">
  import Button from '$lib/ui/button.svelte'
  import SchemaFormListRow from './schema-form-list-row.svelte'
  import type { FieldProps, JsonSchema } from './types'
  import { defaultValue, fieldLabel, getItemLabel } from './utils'

  interface Props extends FieldProps {}

  let { schema, value, path, onChange, onNavigate, disabled = false }: Props = $props()

  const items = $derived((value ?? []) as unknown[])
  const itemSchema = $derived(schema.items ?? ({ type: 'string' } as JsonSchema))
  const label = $derived(fieldLabel(schema, path, 'Items'))

  function add() {
    onChange(path, [...items, defaultValue(itemSchema)])
    onNavigate?.([...path, String(items.length)])
  }

  function remove(index: number) {
    onChange(
      path,
      items.filter((_, i) => i !== index)
    )
  }
</script>

<sf-list>
  {#if items.length === 0}
    <sf-list-empty>No items</sf-list-empty>
  {:else}
    {#each items as item, i (i)}
      <SchemaFormListRow
        label={getItemLabel(item, i, label)}
        removeLabel="Remove item"
        {disabled}
        onOpen={() => onNavigate?.([...path, String(i)])}
        onRemove={() => remove(i)}
      />
    {/each}
  {/if}
  <sf-list-actions>
    <Button size="sm" onclick={add} {disabled}>Add</Button>
  </sf-list-actions>
</sf-list>

<style>
  sf-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
  }

  sf-list-empty {
    display: block;
    padding-block: 0.25rem;
    color: var(--foreground-l4);
    font-size: var(--step--1);
  }

  sf-list-actions {
    display: flex;
    margin-block-start: var(--space-3xs);
  }
</style>
