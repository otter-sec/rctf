<script lang="ts">
  import Button from '$lib/ui/button.svelte'
  import { tick } from 'svelte'
  import SchemaFormListRow from './schema-form-list-row.svelte'
  import { getSchemaFormErrors, type JsonSchema } from './types'
  import {
    arrayItemSchema,
    defaultValue,
    fieldLabel,
    getItemLabel,
  } from './utils'

  interface Props {
    schema: JsonSchema
    value: unknown
    path: string[]
    onChange: (path: string[], value: unknown) => void
    onOpen: (entryPath: string[]) => void
    onAdded: (entryPath: string[]) => void
    onRemoved?: (index: number) => void
    disabled?: boolean
  }

  let {
    schema,
    value,
    path,
    onChange,
    onOpen,
    onAdded,
    onRemoved,
    disabled = false,
  }: Props = $props()

  const errorsContext = getSchemaFormErrors()

  const items = $derived((value ?? []) as unknown[])
  const itemSchema = $derived(arrayItemSchema(schema))
  const label = $derived(fieldLabel(schema, path, 'Items'))

  let listEl = $state<HTMLElement | null>(null)

  function add() {
    const next = [...items, defaultValue(itemSchema)]
    onChange(path, next)
    onAdded([...path, String(next.length - 1)])
  }

  function remove(index: number) {
    onChange(
      path,
      items.filter((_, i) => i !== index)
    )
    onRemoved?.(index)
    void tick().then(() =>
      listEl?.querySelector<HTMLElement>('sf-list-actions button')?.focus()
    )
  }
</script>

<sf-list bind:this={listEl}>
  {#if items.length === 0}
    <sf-list-empty>No items</sf-list-empty>
  {:else}
    {#each items as item, i (i)}
      <SchemaFormListRow
        label={getItemLabel(item, i, label)}
        removeLabel="Remove item"
        status={errorsContext?.status([...path, String(i)])}
        {disabled}
        onOpen={() => onOpen([...path, String(i)])}
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
