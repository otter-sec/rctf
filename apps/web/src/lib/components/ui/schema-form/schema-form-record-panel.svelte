<script lang="ts">
  import { Button, Field, Input, Select } from '$lib/components'
  import { IconPlus, IconX } from '$lib/icons'
  import { cn } from '$lib/utils'
  import SchemaFormField from './schema-form-field.svelte'
  import SchemaFormPanelLayout from './schema-form-panel-layout.svelte'
  import type { SchemaFormFieldProps, JsonSchema } from './types'
  import { defaultValue, renameRecordKey } from './utils'

  interface Props extends SchemaFormFieldProps {}

  let { schema, value, path, onChange, disabled = false }: Props = $props()

  const entries = $derived(Object.entries((value ?? {}) as Record<string, unknown>))
  const valueSchema = $derived(
    (typeof schema.additionalProperties === 'object'
      ? schema.additionalProperties
      : { type: 'string' }) as JsonSchema
  )
  const label = $derived(schema.title ?? path[path.length - 1] ?? 'Items')

  const keyEnumValues = $derived(schema.propertyNames?.enum as string[] | undefined)
  const availableKeys = $derived(
    keyEnumValues?.filter(k => !entries.some(([ek]) => ek === k)) ?? []
  )

  let selectedKey = $state<string | null>(null)
  let keyNameInput = $state('')
  let newKeyInput = $state('')
  let newKeySelect = $state('')
  let pendingKey = $state<string | null>(null)
  const isDuplicateKey = $derived(
    newKeyInput.trim() !== '' && entries.some(([k]) => k === newKeyInput.trim())
  )

  $effect(() => {
    if (pendingKey && entries.some(([k]) => k === pendingKey)) {
      selectedKey = pendingKey
      pendingKey = null
      return
    }
    if (pendingKey) return

    if (selectedKey && !entries.some(([k]) => k === selectedKey)) {
      selectedKey = entries[0]?.[0] ?? null
    }
    if (!selectedKey && entries.length > 0) {
      selectedKey = entries[0]![0]
    }
  })

  $effect(() => {
    if (!pendingKey) {
      keyNameInput = selectedKey ?? ''
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
    if (!newKey.trim() || oldKey === newKey || entries.some(([k]) => k === newKey)) {
      keyNameInput = oldKey
      return
    }
    pendingKey = newKey
    keyNameInput = newKey
    onChange(path, renameRecordKey((value as Record<string, unknown>) ?? {}, oldKey, newKey))
  }
</script>

<SchemaFormPanelLayout {label}>
  {#snippet sidebar()}
    {#if entries.length === 0}
      <p class="text-sm px-2 py-1.5 text-foreground-l4">No entries</p>
    {:else}
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
    {/if}
  {/snippet}

  {#snippet footer()}
    <Field.Field data-invalid={isDuplicateKey || undefined}>
      <div class="flex min-w-0 gap-1">
        {#if keyEnumValues}
          <Select.Root
            type="single"
            value={newKeySelect}
            onValueChange={v => (newKeySelect = v)}
            disabled={disabled || availableKeys.length === 0}>
            <Select.Trigger class="min-w-0 flex-1 font-mono text-sm">
              <span class="truncate">{newKeySelect || 'Select key...'}</span>
            </Select.Trigger>
            <Select.Content>
              {#each availableKeys as key}
                <Select.Item value={key} label={key}>{key}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        {:else}
          <Input
            type="text"
            class="min-w-0 flex-1 font-mono text-sm"
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
        {/if}
        <Button
          class="shrink-0"
          size="icon"
          onclick={() => {
            if (keyEnumValues) {
              if (newKeySelect) {
                addEntry(newKeySelect)
                newKeySelect = ''
              }
            } else {
              addEntry(newKeyInput.trim())
            }
          }}
          disabled={disabled ||
            (keyEnumValues ? !newKeySelect : !newKeyInput.trim() || isDuplicateKey)}>
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
      {#if !keyEnumValues}
        <div class="mb-3">
          <Field.Field>
            <Field.Label>Key name</Field.Label>
            <Input
              type="text"
              class="font-mono"
              bind:value={keyNameInput}
              onblur={() => renameEntry(selectedKey!, keyNameInput)}
              {disabled} />
          </Field.Field>
        </div>
      {/if}
      <SchemaFormField
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
</SchemaFormPanelLayout>
