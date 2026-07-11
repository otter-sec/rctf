<script lang="ts">
  import { IconX } from '$lib/icons'
  import Button from '$lib/ui/button.svelte'
  import Input from '$lib/ui/input.svelte'
  import SchemaFormSelect from './schema-form-select.svelte'
  import { getSchemaFormErrors, type FieldProps } from './types'
  import {
    addRecordEntry,
    fieldLabel,
    parseNumber,
    recordValueSchema,
    removeRecordEntry,
    renameRecordEntry,
  } from './utils'

  interface Props extends FieldProps {}

  let { schema, value, path, onChange, disabled = false }: Props = $props()

  const errorsContext = getSchemaFormErrors()

  const entries = $derived(Object.entries((value ?? {}) as Record<string, unknown>))
  const valueSchema = $derived(recordValueSchema(schema))
  const label = $derived(fieldLabel(schema, path, 'Items'))
  const description = $derived(schema.description)
  const isNumeric = $derived(valueSchema.type === 'number' || valueSchema.type === 'integer')
  const isBoolean = $derived(valueSchema.type === 'boolean')

  const keyEnumValues = $derived(schema.propertyNames?.enum as string[] | undefined)
  const availableKeys = $derived(
    keyEnumValues?.filter(k => !entries.some(([ek]) => ek === k)) ?? []
  )

  let newKeyInput = $state('')
  let selectedKey = $state('')
  let keyInputs = $state<Record<string, string>>({})

  $effect(() => {
    const currentKeys = new Set(entries.map(([k]) => k))

    for (const key of currentKeys) {
      if (!(key in keyInputs)) keyInputs[key] = key
    }

    for (const key of Object.keys(keyInputs)) {
      if (!currentKeys.has(key)) delete keyInputs[key]
    }
  })

  const isDuplicateKey = $derived(
    newKeyInput.trim() !== '' && entries.some(([k]) => k === newKeyInput.trim())
  )

  function addEntry(key: string) {
    const next = addRecordEntry(value, key, valueSchema)
    if (!next) return
    onChange(path, next)
    newKeyInput = ''
  }

  function removeEntry(key: string) {
    onChange(path, removeRecordEntry(value, key))
  }

  function renameEntry(oldKey: string, newKey: string) {
    const next = renameRecordEntry(value, oldKey, newKey)
    if (!next) {
      keyInputs[oldKey] = oldKey
      return
    }

    delete keyInputs[oldKey]
    keyInputs[newKey] = newKey
    onChange(path, next)
  }

  function handleValueInput(key: string, inputValue: string) {
    if (!isNumeric) {
      onChange([...path, key], inputValue)
      return
    }

    if (inputValue === '') {
      onChange([...path, key], undefined)
      return
    }

    const num = parseNumber(inputValue)
    onChange([...path, key], num ?? inputValue)
  }

  function addFromControls() {
    if (keyEnumValues) {
      if (selectedKey) {
        addEntry(selectedKey)
        selectedKey = ''
      }
    } else {
      addEntry(newKeyInput.trim())
    }
  }
</script>

<record-field>
  <record-label>
    {label}
    {#if description}<record-hint>({description})</record-hint>{/if}
  </record-label>

  <record-rows>
    {#each entries as [key, val] (key)}
      {@const error = errorsContext?.get([...path, key])?.message ?? null}
      <record-row>
        <record-controls>
          {#if keyEnumValues}
            <record-key-name>{key}</record-key-name>
          {:else}
            <record-key>
              <Input
                type="text"
                bind:value={keyInputs[key]}
                onblur={() => renameEntry(key, keyInputs[key] ?? key)}
                {disabled}
              />
            </record-key>
          {/if}
          <record-eq>=</record-eq>
          {#if isBoolean}
            <record-value>
              <SchemaFormSelect
                options={[
                  { value: 'true', label: 'true' },
                  { value: 'false', label: 'false' },
                ]}
                value={Boolean(val) ? 'true' : 'false'}
                onValueChange={v => onChange([...path, key], v === 'true')}
                label={key}
                {disabled}
              />
            </record-value>
          {:else}
            <record-value>
              <Input
                type="text"
                inputmode={isNumeric ? 'decimal' : 'text'}
                value={String(val ?? '')}
                oninput={event => handleValueInput(key, event.currentTarget.value)}
                aria-invalid={error ? 'true' : undefined}
                {disabled}
              />
            </record-value>
          {/if}
          {#if !disabled}
            <Button
              type="button"
              size="icon-sm"
              variant="destructive"
              aria-label="Remove {key}"
              onclick={() => removeEntry(key)}
            >
              <IconX />
            </Button>
          {/if}
        </record-controls>
        {#if error}<record-error role="alert">{error}</record-error>{/if}
      </record-row>
    {/each}

    <record-row>
      <record-controls>
        {#if keyEnumValues}
          <record-key>
            <SchemaFormSelect
              options={availableKeys.map(k => ({ value: k, label: k }))}
              value={selectedKey}
              onValueChange={v => (selectedKey = v)}
              label="New key"
              placeholder="Select key..."
              disabled={disabled || availableKeys.length === 0}
            />
          </record-key>
        {:else}
          <record-key>
            <Input
              type="text"
              placeholder="new key"
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
          </record-key>
        {/if}
        <record-eq>=</record-eq>
        <Button
          size="sm"
          onclick={addFromControls}
          disabled={disabled ||
            (keyEnumValues ? !selectedKey : !newKeyInput.trim() || isDuplicateKey)}
        >
          Add
        </Button>
      </record-controls>
      {#if isDuplicateKey}<record-error role="alert">Key already exists</record-error>{/if}
    </record-row>
  </record-rows>
</record-field>

<style>
  record-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    container-type: inline-size;
  }

  record-label {
    color: var(--foreground-l1);
  }

  record-hint {
    color: var(--foreground-l3);
    font-size: var(--step--1);
  }

  record-rows {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
  }

  record-row {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
  }

  record-controls {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);

    @container (min-width: 24rem) {
      flex-direction: row;
      align-items: center;
    }
  }

  record-key-name,
  record-key {
    flex-shrink: 0;
    font-family: var(--font-mono);

    @container (min-width: 24rem) {
      inline-size: 8rem;
    }
  }

  record-key-name {
    color: var(--foreground-l2);
    font-size: var(--step--1);
  }

  record-eq {
    color: var(--foreground-l4);
  }

  record-value {
    display: flex;
    flex: 1;
    min-inline-size: 0;
    align-items: center;
  }

  record-error {
    color: var(--foreground-destructive);
    font-size: var(--step--1);
  }
</style>
