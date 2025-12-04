<script lang="ts">
  import { Button, Field, Input, ScrollArea, Section } from '$lib/components'
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

  const entries = $derived(Object.entries((value ?? {}) as Record<string, unknown>))
  const valueSchema = $derived(
    (typeof schema.additionalProperties === 'object'
      ? schema.additionalProperties
      : { type: 'string' }) as JsonSchema
  )
  const label = $derived(schema.title ?? path[path.length - 1] ?? 'Items')
  const description = $derived(schema.description)

  // For simple value types (string, number), render inline
  const isSimpleValue = $derived(
    ['string', 'number', 'integer', 'boolean'].includes(valueSchema.type ?? '')
  )

  let selectedKey = $state<string | null>(null)
  let newKeyInput = $state('')

  $effect(() => {
    if (selectedKey && !entries.some(([k]) => k === selectedKey)) {
      selectedKey = entries[0]?.[0] ?? null
    }
    if (!selectedKey && entries.length > 0) {
      selectedKey = entries[0]![0]
    }
  })

  function defaultValue(s: JsonSchema): unknown {
    if (s.default !== undefined) return JSON.parse(JSON.stringify(s.default))
    if (s.type === 'object' && s.properties) {
      const obj: Record<string, unknown> = {}
      for (const [k, p] of Object.entries(s.properties)) {
        obj[k] = defaultValue(p)
      }
      return obj
    }
    if (s.type === 'array') return []
    if (s.type === 'string') return ''
    if (s.type === 'number' || s.type === 'integer') return 0
    if (s.type === 'boolean') return false
    return null
  }

  function addEntry(key: string) {
    if (!key.trim() || entries.some(([k]) => k === key)) return
    const newValue = {
      ...((value as Record<string, unknown>) ?? {}),
      [key]: defaultValue(valueSchema),
    }
    onChange(path, newValue)
    selectedKey = key
    newKeyInput = ''
  }

  function removeEntry(key: string) {
    const newValue = { ...((value as Record<string, unknown>) ?? {}) }
    delete newValue[key]
    onChange(path, newValue)
  }

  function renameEntry(oldKey: string, newKey: string) {
    if (!newKey.trim() || oldKey === newKey || entries.some(([k]) => k === newKey)) return
    const obj = (value as Record<string, unknown>) ?? {}
    const newValue: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      newValue[k === oldKey ? newKey : k] = v
    }
    onChange(path, newValue)
    selectedKey = newKey
  }
</script>

{#if isSimpleValue}
  <!-- Simple key-value pairs rendered as tag-like inputs -->
  <Field.Field>
    <Field.Label>
      {label}
      {#if description}
        <Field.Hint>({description})</Field.Hint>
      {/if}
    </Field.Label>
    <div class="flex flex-col gap-2">
      {#each entries as [key, val] (key)}
        <div class="flex items-center gap-2">
          <Input
            type="text"
            class="w-32 font-mono text-sm"
            value={key}
            onblur={e => renameEntry(key, e.currentTarget.value)}
            {disabled} />
          <span class="text-foreground-l4">=</span>
          {#if valueSchema.type === 'boolean'}
            <Button
              variant="outline"
              size="sm"
              onclick={() => onChange([...path, key], !val)}
              {disabled}>
              {val ? 'true' : 'false'}
            </Button>
          {:else}
            <Input
              type={valueSchema.type === 'number' || valueSchema.type === 'integer'
                ? 'number'
                : 'text'}
              class="flex-1 font-mono text-sm"
              value={(val as string | number) ?? ''}
              oninput={e => {
                const v =
                  valueSchema.type === 'number' || valueSchema.type === 'integer'
                    ? Number(e.currentTarget.value)
                    : e.currentTarget.value
                onChange([...path, key], v)
              }}
              {disabled} />
          {/if}
          {#if !disabled}
            <button
              type="button"
              class="rounded p-1 hover:bg-background-l3"
              onclick={() => removeEntry(key)}>
              <IconX class="size-4" />
            </button>
          {/if}
        </div>
      {/each}
      <div class="flex items-center gap-2">
        <Input
          type="text"
          class="w-32 font-mono text-sm"
          placeholder="new key"
          bind:value={newKeyInput}
          onkeydown={e => {
            if (e.key === 'Enter' && newKeyInput.trim()) {
              e.preventDefault()
              addEntry(newKeyInput.trim())
            }
          }}
          {disabled} />
        <Button
          variant="outline"
          size="sm"
          onclick={() => addEntry(newKeyInput.trim())}
          disabled={disabled || !newKeyInput.trim()}>
          <IconPlus class="size-4" />
          Add
        </Button>
      </div>
    </div>
  </Field.Field>
{:else}
  <!-- Complex values with sidebar -->
  <Section.Root>
    <Section.Header>{label}</Section.Header>
    <Section.Content class="p-0">
      <div class="flex min-h-[200px]">
        <div class="relative w-44 shrink-0 border-r-2">
          <div class="absolute inset-0 flex flex-col">
            <ScrollArea class="min-h-0 flex-1" fadeColor="background-l2">
              <div class="flex flex-col gap-0.5 p-2">
                {#each entries as [key] (key)}
                  {@const active = selectedKey === key}
                  <div
                    class="group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm
                      {active
                      ? 'bg-background-l4 text-foreground-l0'
                      : 'text-foreground-l4 hover:bg-background-l3 hover:text-foreground-l0'}"
                    role="button"
                    tabindex="0"
                    onclick={() => (selectedKey = key)}
                    onkeydown={e =>
                      (e.key === 'Enter' || e.key === ' ') &&
                      (e.preventDefault(), (selectedKey = key))}>
                    <span class="flex-1 truncate font-mono">{key}</span>
                    <button
                      type="button"
                      class="rounded p-0.5 hover:bg-background-destructive hover:text-foreground-destructive
                        {active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}"
                      onclick={e => (e.stopPropagation(), removeEntry(key))}
                      {disabled}>
                      <IconX class="size-3" />
                    </button>
                  </div>
                {/each}
              </div>
            </ScrollArea>
            <div class="shrink-0 border-t-2 p-2">
              <div class="flex gap-1">
                <Input
                  type="text"
                  class="flex-1 font-mono text-sm"
                  placeholder="key"
                  bind:value={newKeyInput}
                  onkeydown={e => {
                    if (e.key === 'Enter' && newKeyInput.trim()) {
                      e.preventDefault()
                      addEntry(newKeyInput.trim())
                    }
                  }}
                  {disabled} />
                <Button
                  size="sm"
                  onclick={() => addEntry(newKeyInput.trim())}
                  disabled={disabled || !newKeyInput.trim()}>
                  <IconPlus class="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div class="min-w-0 flex-1 overflow-auto p-4">
          {#if selectedKey && entries.some(([k]) => k === selectedKey)}
            <div class="mb-3">
              <Field.Field>
                <Field.Label>Key name</Field.Label>
                <Input
                  type="text"
                  class="font-mono"
                  value={selectedKey}
                  onblur={e => renameEntry(selectedKey!, e.currentTarget.value)}
                  {disabled} />
              </Field.Field>
            </div>
            <SchemaField
              schema={valueSchema}
              value={entries.find(([k]) => k === selectedKey)?.[1]}
              path={[...path, selectedKey]}
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
