<script lang="ts">
  import { Button, Field, Input } from '$lib/components'
  import { IconPlus, IconX } from '$lib/icons'
  import { cn } from '$lib/utils'
  import SchemaField from '../schema-field.svelte'
  import PanelLayout from '../shared/panel-layout.svelte'
  import type { FieldProps, JsonSchema } from '../types'
  import { defaultValue } from '../utils'

  interface Props extends FieldProps {}

  let { schema, value, path, onChange, disabled = false }: Props = $props()

  const entries = $derived(Object.entries((value ?? {}) as Record<string, unknown>))
  const valueSchema = $derived(
    (typeof schema.additionalProperties === 'object'
      ? schema.additionalProperties
      : { type: 'string' }) as JsonSchema
  )
  const label = $derived(schema.title ?? path[path.length - 1] ?? 'Items')

  let selectedKey = $state<string | null>(null)
  let newKeyInput = $state('')
  const isDuplicateKey = $derived(
    newKeyInput.trim() !== '' && entries.some(([k]) => k === newKeyInput.trim())
  )

  $effect(() => {
    if (selectedKey && !entries.some(([k]) => k === selectedKey)) {
      selectedKey = entries[0]?.[0] ?? null
    }
    if (!selectedKey && entries.length > 0) {
      selectedKey = entries[0]![0]
    }
  })

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

<PanelLayout {label}>
  {#snippet sidebar()}
    {#each entries as [key] (key)}
      {@const active = selectedKey === key}
      <div
        class={cn(
          'group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm',
          active
            ? 'bg-background-l4 text-foreground-l0'
            : 'text-foreground-l4 hover:bg-background-l3 hover:text-foreground-l0'
        )}
        role="button"
        tabindex="0"
        onclick={() => (selectedKey = key)}
        onkeydown={e =>
          (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), (selectedKey = key))}>
        <span class="flex-1 truncate font-mono">{key}</span>
        <button
          type="button"
          class={cn(
            'rounded p-0.5 hover:bg-background-destructive hover:text-foreground-destructive',
            active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
          onclick={e => (e.stopPropagation(), removeEntry(key))}
          {disabled}>
          <IconX class="size-3" />
        </button>
      </div>
    {/each}
  {/snippet}

  {#snippet footer()}
    <Field.Field data-invalid={isDuplicateKey || undefined}>
      <div class="flex gap-1">
        <Input
          type="text"
          class="flex-1 font-mono text-sm"
          placeholder="key"
          bind:value={newKeyInput}
          onkeydown={e => {
            if (e.key === 'Enter' && newKeyInput.trim() && !isDuplicateKey) {
              e.preventDefault()
              addEntry(newKeyInput.trim())
            }
          }}
          aria-invalid={isDuplicateKey}
          {disabled} />
        <Button
          size="icon"
          onclick={() => addEntry(newKeyInput.trim())}
          disabled={disabled || !newKeyInput.trim() || isDuplicateKey}>
          <IconPlus class="size-4" />
        </Button>
      </div>
      {#if isDuplicateKey}
        <Field.Error>Key already exists</Field.Error>
      {/if}
    </Field.Field>
  {/snippet}

  {#snippet content()}
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
  {/snippet}
</PanelLayout>
