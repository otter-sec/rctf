<script lang="ts">
  import { Button, Field, ScrollArea, Section } from '$lib/components'
  import { IconPlus, IconX } from '$lib/icons'
  import SchemaField from './schema-field.svelte'
  import type { JsonSchema } from './types'

  interface Props {
    schema: JsonSchema
    value: unknown
    path: string[]
    onChange: (path: string[], value: unknown) => void
    disabled?: boolean
  }

  let { schema, value, path, onChange, disabled = false }: Props = $props()

  const items = $derived((value ?? []) as unknown[])
  const itemSchema = $derived(schema.items ?? { type: 'string' })
  const label = $derived(schema.title ?? path[path.length - 1] ?? 'Items')
  const description = $derived(schema.description)
  const isPrimitive = $derived(['string', 'number', 'integer'].includes(itemSchema.type ?? ''))

  let selectedIndex = $state(0)

  $effect(() => {
    if (selectedIndex >= items.length) selectedIndex = Math.max(0, items.length - 1)
  })

  function getItemLabel(item: unknown, i: number) {
    if (typeof item === 'object' && item !== null) {
      const o = item as Record<string, unknown>
      if (typeof o.name === 'string') {
        return o.name
      }
      if (typeof o.title === 'string') {
        return o.title
      }
    }
    return `${label} ${i + 1}`
  }

  function defaultValue(s: JsonSchema): unknown {
    // For objects, merge schema default with recursively computed property defaults
    if (s.type === 'object' && s.properties) {
      const base =
        s.default && typeof s.default === 'object' && !Array.isArray(s.default)
          ? (JSON.parse(JSON.stringify(s.default)) as Record<string, unknown>)
          : {}
      for (const [k, p] of Object.entries(s.properties)) {
        if (base[k] === undefined) {
          base[k] = defaultValue(p)
        }
      }
      return base
    }

    // For non-objects, use schema default if available
    if (s.default !== undefined) {
      return JSON.parse(JSON.stringify(s.default))
    }

    if (s.type === 'array') return []
    if (s.type === 'string') return ''
    if (s.type === 'number' || s.type === 'integer') return 0
    if (s.type === 'boolean') return false
    return null
  }

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

{#if isPrimitive}
  <Field.Field>
    <Field.Label>
      {label}
      {#if description}
        <Field.Hint>({description})</Field.Hint>
      {/if}
    </Field.Label>
    <div
      class="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border bg-background-l1 px-2 py-1.5
      focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2
      {disabled ? 'cursor-not-allowed opacity-50' : ''}">
      {#each items as item, i (i)}
        <span
          class="inline-flex items-center gap-1 rounded-md bg-background-l3 px-2 py-0.5 text-sm font-mono">
          {item}
          {#if !disabled}
            <button
              type="button"
              class="ml-0.5 rounded-sm hover:bg-background-l4"
              onclick={() => remove(i)}>
              <IconX class="size-3" />
            </button>
          {/if}
        </span>
      {/each}
      <input
        type="text"
        class="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        placeholder={items.length === 0 ? 'Type and press Enter...' : 'Add more...'}
        onkeydown={e => {
          const input = e.currentTarget
          if (e.key === 'Enter' && input.value.trim()) {
            e.preventDefault()
            const v = input.value.trim()
            onChange(path, [...items, itemSchema.type === 'string' ? v : Number(v)])
            input.value = ''
          } else if (e.key === 'Backspace' && !input.value && items.length > 0) {
            remove(items.length - 1)
          }
        }}
        {disabled} />
    </div>
  </Field.Field>
{:else}
  <Section.Root>
    <Section.Header>{label}</Section.Header>
    <Section.Content class="p-0">
      <div class="flex min-h-[200px]">
        <div class="relative w-44 shrink-0 border-r-2">
          <div class="absolute inset-0 flex flex-col">
            <ScrollArea class="min-h-0 flex-1" fadeColor="background-l2">
              <div class="flex flex-col gap-0.5 p-2">
                {#each items as item, i (i)}
                  {@const active = selectedIndex === i}
                  <div
                    class="group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm
                      {active
                      ? 'bg-background-l4 text-foreground-l0'
                      : 'text-foreground-l4 hover:bg-background-l3 hover:text-foreground-l0'}"
                    role="button"
                    tabindex="0"
                    onclick={() => (selectedIndex = i)}
                    onkeydown={e =>
                      (e.key === 'Enter' || e.key === ' ') &&
                      (e.preventDefault(), (selectedIndex = i))}>
                    <span class="flex-1 truncate font-mono">{getItemLabel(item, i)}</span>
                    <button
                      type="button"
                      class="rounded p-0.5 hover:bg-background-destructive hover:text-foreground-destructive
                        {active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}"
                      onclick={e => (e.stopPropagation(), remove(i))}
                      {disabled}>
                      <IconX class="size-3" />
                    </button>
                  </div>
                {/each}
              </div>
            </ScrollArea>
            <div class="shrink-0 border-t-2 p-2">
              <Button size="sm" class="w-full" onclick={add} {disabled}>
                <IconPlus class="size-4" />
                Add
              </Button>
            </div>
          </div>
        </div>

        <div class="min-w-0 flex-1 overflow-auto p-4">
          {#if items[selectedIndex] !== undefined}
            <SchemaField
              schema={itemSchema}
              value={items[selectedIndex]}
              path={[...path, String(selectedIndex)]}
              {onChange}
              {disabled}
              showLabel={false} />
          {:else}
            <div class="flex h-full items-center justify-center text-sm text-foreground-l4">
              Add an item to get started
            </div>
          {/if}
        </div>
      </div>
    </Section.Content>
  </Section.Root>
{/if}
