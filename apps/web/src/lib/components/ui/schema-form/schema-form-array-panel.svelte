<script lang="ts">
  import { Button } from '$lib/components'
  import { IconPlus, IconX } from '$lib/icons'
  import { cn } from '$lib/utils'
  import SchemaFormField from './schema-form-field.svelte'
  import SchemaFormPanelLayout from './schema-form-panel-layout.svelte'
  import type { JsonSchema, SchemaFormFieldProps } from './types'
  import { defaultValue, getItemLabel } from './utils'

  interface Props extends SchemaFormFieldProps {}

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

<SchemaFormPanelLayout {label}>
  {#snippet sidebar()}
    {#if items.length === 0}
      <p class="text-foreground-l4 px-2 py-1.5 text-sm">No items</p>
    {:else}
      {#each items as item, i (i)}
        {@const active = selectedIndex === i}
        <div
          class={cn(
            'group flex max-w-full cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm @md/panel:w-full @md/panel:gap-2',
            active
              ? 'bg-background-l4 text-foreground-l0'
              : 'text-foreground-l4 hover:bg-background-l3 hover:text-foreground-l0'
          )}
          role="button"
          tabindex="0"
          onclick={() => (selectedIndex = i)}
          onkeydown={e =>
            (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), (selectedIndex = i))}
        >
          <span class="truncate @md/panel:min-w-0 @md/panel:flex-1"
            >{getItemLabel(item, i, label)}</span
          >
          <button
            type="button"
            class={cn(
              'hover:bg-background-destructive hover:text-foreground-destructive shrink-0 rounded p-0.5',
              active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 @max-md/panel:opacity-100'
            )}
            onclick={e => (e.stopPropagation(), remove(i))}
            {disabled}
          >
            <IconX class="size-3" />
          </button>
        </div>
      {/each}
    {/if}
  {/snippet}

  {#snippet footer()}
    <Button size="sm" class="w-full" onclick={add} {disabled}>
      <IconPlus class="size-4" />
      Add
    </Button>
  {/snippet}

  {#snippet content()}
    {#if items[selectedIndex] !== undefined}
      <SchemaFormField
        schema={itemSchema}
        value={items[selectedIndex]}
        path={[...path, String(selectedIndex)]}
        {onChange}
        {disabled}
        showLabel={false}
      />
    {:else}
      <div class="text-foreground-l4 flex h-full items-center justify-center text-sm">
        Add an item to get started
      </div>
    {/if}
  {/snippet}
</SchemaFormPanelLayout>
