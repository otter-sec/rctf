<script lang="ts">
  import IconX from '$lib/icons/icon-x.svelte'
  import Button from '$lib/ui/button.svelte'
  import Field from '$lib/ui/field.svelte'
  import Input from '$lib/ui/input.svelte'
  import SchemaFormField from './schema-form-field.svelte'
  import SchemaFormPanelLayout from './schema-form-panel-layout.svelte'
  import SchemaFormSelect from './schema-form-select.svelte'
  import type { FieldProps, JsonSchema } from './types'
  import { defaultValue, renameRecordKey } from './utils'

  interface Props extends FieldProps {}

  let { schema, value, path, onChange, onError, disabled = false }: Props = $props()

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
  const selectedValue = $derived(entries.find(([k]) => k === selectedKey)?.[1])

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
    if (!pendingKey) keyNameInput = selectedKey ?? ''
  })

  function addEntry(key: string) {
    if (!key.trim() || entries.some(([k]) => k === key)) return
    onChange(path, {
      ...((value as Record<string, unknown>) ?? {}),
      [key]: defaultValue(valueSchema),
    })
    selectedKey = key
    newKeyInput = ''
  }

  function removeEntry(key: string) {
    const next = { ...((value as Record<string, unknown>) ?? {}) }
    delete next[key]
    onChange(path, next)
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

  function addFromControls() {
    if (keyEnumValues) {
      if (newKeySelect) {
        addEntry(newKeySelect)
        newKeySelect = ''
      }
    } else {
      addEntry(newKeyInput.trim())
    }
  }
</script>

<SchemaFormPanelLayout label={label as string}>
  {#snippet sidebar()}
    {#if entries.length === 0}
      <panel-empty>No entries</panel-empty>
    {:else}
      {#each entries as [key] (key)}
        <panel-item data-active={selectedKey === key || undefined}>
          <button type="button" class="pick" onclick={() => (selectedKey = key)}>{key}</button>
          <button
            type="button"
            class="remove"
            aria-label="Remove {key}"
            onclick={() => removeEntry(key)}
            {disabled}
          >
            <IconX />
          </button>
        </panel-item>
      {/each}
    {/if}
  {/snippet}

  {#snippet footer()}
    <panel-add>
      {#if keyEnumValues}
        <panel-add-key>
          <SchemaFormSelect
            options={availableKeys.map(k => ({ value: k, label: k }))}
            value={newKeySelect}
            onValueChange={v => (newKeySelect = v)}
            label="New key"
            placeholder="Select key..."
            disabled={disabled || availableKeys.length === 0}
          />
        </panel-add-key>
      {:else}
        <panel-add-key>
          <Input
            type="text"
            placeholder="key"
            bind:value={newKeyInput}
            onkeydown={event => {
              if (event.key === 'Enter' && newKeyInput.trim() && !isDuplicateKey) {
                event.preventDefault()
                addEntry(newKeyInput.trim())
              }
            }}
            aria-invalid={isDuplicateKey ? 'true' : undefined}
            {disabled}
          />
        </panel-add-key>
      {/if}
      <Button
        size="icon"
        aria-label="Add entry"
        onclick={addFromControls}
        disabled={disabled ||
          (keyEnumValues ? !newKeySelect : !newKeyInput.trim() || isDuplicateKey)}
      >
        +
      </Button>
    </panel-add>
    {#if isDuplicateKey}<panel-error role="alert">Key already exists</panel-error>{/if}
  {/snippet}

  {#snippet content()}
    {#if selectedKey && entries.some(([k]) => k === selectedKey)}
      {#if !keyEnumValues}
        <panel-rename>
          <Field label="Key name">
            {#snippet children({ id })}
              <Input
                {id}
                type="text"
                bind:value={keyNameInput}
                onblur={() => renameEntry(selectedKey!, keyNameInput)}
                {disabled}
              />
            {/snippet}
          </Field>
        </panel-rename>
      {/if}
      <SchemaFormField
        schema={valueSchema}
        value={selectedValue}
        path={[...path, selectedKey]}
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
    font-family: var(--font-mono);
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

  panel-add {
    display: flex;
    gap: var(--space-3xs);
  }

  panel-add-key {
    flex: 1;
    min-inline-size: 0;
    font-family: var(--font-mono);
  }

  panel-error {
    display: block;
    margin-block-start: var(--space-3xs);
    color: var(--foreground-destructive);
    font-size: var(--step--1);
  }

  panel-rename {
    display: block;
    margin-block-end: var(--space-s);
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
