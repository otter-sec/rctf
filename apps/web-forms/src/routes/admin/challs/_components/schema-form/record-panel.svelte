<script lang="ts">
  import Field from './field.svelte'
  import type { FieldProps, JsonSchema } from './types'
  import { defaultValue, renameRecordKey } from './utils'

  interface Props extends FieldProps {}

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

<fieldset>
  <legend>{label}</legend>

  <div>
    <strong>Keys:</strong>
    {#if entries.length === 0}
      <p>No entries</p>
    {:else}
      <ul>
        {#each entries as [key] (key)}
          <li>
            <button type="button" onclick={() => (selectedKey = key)}>
              {selectedKey === key ? '>' : ' '}
              {key}
            </button>
            {#if !disabled}
              <button type="button" onclick={() => removeEntry(key)}>×</button>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}

    <div>
      {#if keyEnumValues}
        <select bind:value={newKeySelect} disabled={disabled || availableKeys.length === 0}>
          <option value="">Select key...</option>
          {#each availableKeys as key}
            <option value={key}>{key}</option>
          {/each}
        </select>
      {:else}
        <input
          type="text"
          placeholder="key"
          bind:value={newKeyInput}
          onkeydown={e => {
            if (e.key === 'Enter' && newKeyInput.trim() && !isDuplicateKey) {
              e.preventDefault()
              addEntry(newKeyInput.trim())
            }
          }}
          {disabled}
        />
      {/if}
      <button
        type="button"
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
          (keyEnumValues ? !newKeySelect : !newKeyInput.trim() || isDuplicateKey)}
      >
        +
      </button>
    </div>
    {#if isDuplicateKey}
      <small>Key already exists</small>
    {/if}
  </div>

  <hr />

  <div>
    {#if selectedKey && entries.some(([k]) => k === selectedKey)}
      {#if !keyEnumValues}
        <div>
          <strong>Key name:</strong>
          <input
            type="text"
            bind:value={keyNameInput}
            onblur={() => renameEntry(selectedKey!, keyNameInput)}
            {disabled}
          />
        </div>
      {/if}
      <Field
        schema={valueSchema}
        value={entries.find(([k]) => k === selectedKey)?.[1]}
        path={[...path, selectedKey]}
        {onChange}
        {disabled}
        showLabel={false}
      />
    {:else}
      <p>Add an item to get started</p>
    {/if}
  </div>
</fieldset>
