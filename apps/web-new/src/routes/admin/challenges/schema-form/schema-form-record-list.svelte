<script lang="ts">
  import Button from '$lib/ui/button.svelte'
  import Input from '$lib/ui/input.svelte'
  import { tick } from 'svelte'
  import SchemaFormListRow from './schema-form-list-row.svelte'
  import SchemaFormSelect from './schema-form-select.svelte'
  import { getSchemaFormErrors, type JsonSchema } from './types'
  import { addRecordEntry, recordValueSchema, removeRecordEntry } from './utils'

  interface Props {
    schema: JsonSchema
    value: unknown
    path: string[]
    onChange: (path: string[], value: unknown) => void
    onOpen: (entryPath: string[]) => void
    onAdded: (entryPath: string[]) => void
    onRemoved?: (key: string) => void
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

  const entries = $derived(Object.entries((value ?? {}) as Record<string, unknown>))
  const valueSchema = $derived(recordValueSchema(schema))

  const keyEnumValues = $derived(schema.propertyNames?.enum as string[] | undefined)
  const availableKeys = $derived(
    keyEnumValues?.filter(k => !entries.some(([ek]) => ek === k)) ?? []
  )

  let listEl = $state<HTMLElement | null>(null)
  let newKeyInput = $state('')
  let newKeySelect = $state('')

  const isDuplicateKey = $derived(
    newKeyInput.trim() !== '' && entries.some(([k]) => k === newKeyInput.trim())
  )

  function addEntry(key: string) {
    const next = addRecordEntry(value, key, valueSchema)
    if (!next) return
    onChange(path, next)
    newKeyInput = ''
    onAdded([...path, key])
  }

  function removeEntry(key: string) {
    onChange(path, removeRecordEntry(value, key))
    onRemoved?.(key)
    void tick().then(() =>
      listEl?.querySelector<HTMLElement>('sf-list-add input, sf-list-add button')?.focus()
    )
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

<sf-list bind:this={listEl}>
  {#if entries.length === 0}
    <sf-list-empty>No entries</sf-list-empty>
  {:else}
    {#each entries as [key] (key)}
      <SchemaFormListRow
        label={key}
        removeLabel="Remove {key}"
        status={errorsContext?.status([...path, key])}
        mono
        {disabled}
        onOpen={() => onOpen([...path, key])}
        onRemove={() => removeEntry(key)}
      />
    {/each}
  {/if}
  <sf-list-add>
    {#if keyEnumValues}
      <sf-add-key>
        <SchemaFormSelect
          options={availableKeys.map(k => ({ value: k, label: k }))}
          value={newKeySelect}
          onValueChange={v => (newKeySelect = v)}
          label="New key"
          placeholder="Select key..."
          disabled={disabled || availableKeys.length === 0}
        />
      </sf-add-key>
    {:else}
      <sf-add-key>
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
      </sf-add-key>
    {/if}
    <Button
      size="icon"
      aria-label="Add entry"
      onclick={addFromControls}
      disabled={disabled || (keyEnumValues ? !newKeySelect : !newKeyInput.trim() || isDuplicateKey)}
    >
      +
    </Button>
  </sf-list-add>
  {#if isDuplicateKey}<sf-list-error role="alert">Key already exists</sf-list-error>{/if}
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

  sf-list-add {
    display: flex;
    gap: var(--space-3xs);
    margin-block-start: var(--space-3xs);
  }

  sf-add-key {
    flex: 1;
    min-inline-size: 0;
    max-inline-size: 16rem;
    font-family: var(--font-mono);
  }

  sf-list-error {
    display: block;
    color: var(--foreground-destructive);
    font-size: var(--step--1);
  }
</style>
