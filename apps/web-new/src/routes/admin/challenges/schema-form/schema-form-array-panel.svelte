<script lang="ts">
  import IconX from '$lib/icons/icon-x.svelte'
  import Button from '$lib/ui/button.svelte'
  import SchemaFormField from './schema-form-field.svelte'
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
        <panel-item data-active={selectedIndex === i || undefined}>
          <button type="button" class="pick" onclick={() => (selectedIndex = i)}>
            {getItemLabel(item, i, label as string)}
          </button>
          <button
            type="button"
            class="remove"
            aria-label="Remove item"
            onclick={() => remove(i)}
            {disabled}
          >
            <IconX />
          </button>
        </panel-item>
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

  panel-item {
    display: flex;
    flex: 1;
    align-items: center;
    gap: var(--space-3xs);
    border-radius: var(--radius-md);

    &[data-active] {
      background: var(--background-l4);
    }

    &:not([data-active]):hover {
      background: var(--background-l3);
    }
  }

  .pick {
    flex: 1;
    min-inline-size: 0;
    overflow: hidden;
    padding: 0.375rem var(--space-2xs);
    color: var(--foreground-l4);
    text-align: start;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;

    panel-item[data-active] & {
      color: var(--foreground-l0);
    }
  }

  .remove {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    margin-inline-end: 0.25rem;
    color: var(--foreground-l4);
    cursor: pointer;
    border-radius: var(--radius-sm);

    &:hover {
      color: var(--foreground-destructive);
      background: var(--background-destructive);
    }

    :global(svg) {
      inline-size: 0.75rem;
      block-size: 0.75rem;
    }
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
