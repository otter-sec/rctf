<script lang="ts">
  import { Button, Field, Input, Select } from '$lib/components'
  import { IconPlus, IconX } from '$lib/icons'
  import { getValidationContext } from './context'
  import type { FieldProps, JsonSchema } from './types'
  import { defaultValue, parseNumber, renameRecordKey } from './utils'
  import { validateValue } from './validate'

  interface Props extends FieldProps {}

  let { schema, value, path, onChange, disabled = false }: Props = $props()

  const entries = $derived(Object.entries((value ?? {}) as Record<string, unknown>))
  const valueSchema = $derived(
    (typeof schema.additionalProperties === 'object'
      ? schema.additionalProperties
      : { type: 'string' }) as JsonSchema
  )
  const label = $derived(schema.title ?? path[path.length - 1] ?? 'Items')
  const description = $derived(schema.description)
  const isNumeric = $derived(valueSchema.type === 'number' || valueSchema.type === 'integer')
  const basePath = $derived(path.join('.'))

  const keyEnumValues = $derived(schema.propertyNames?.enum as string[] | undefined)
  const availableKeys = $derived(
    keyEnumValues?.filter(k => !entries.some(([ek]) => ek === k)) ?? []
  )

  const validationCtx = getValidationContext()

  let newKeyInput = $state('')
  let selectedKey = $state('')
  let errors = $state<Record<string, string | null>>({})
  let keyInputs = $state<Record<string, string>>({})
  let pendingRenames = $state<Map<string, string>>(new Map()) // oldKey -> newKey
  let registeredKeys = new Set<string>()

  $effect(() => {
    const currentKeys = new Set(entries.map(([k]) => k))

    for (const [oldKey, newKey] of pendingRenames) {
      if (currentKeys.has(newKey)) {
        pendingRenames.delete(oldKey)
      }
    }

    for (const key of currentKeys) {
      if (!(key in keyInputs)) {
        keyInputs[key] = key
      }
    }

    for (const key of Object.keys(keyInputs)) {
      if (!currentKeys.has(key) && !pendingRenames.has(key)) {
        delete keyInputs[key]
      }
    }
  })

  const isDuplicateKey = $derived(
    newKeyInput.trim() !== '' && entries.some(([k]) => k === newKeyInput.trim())
  )

  $effect(() => {
    return () => {
      for (const pathKey of registeredKeys) {
        validationCtx?.unregisterField(pathKey)
      }
      registeredKeys.clear()
    }
  })

  function setError(key: string, error: string | null) {
    errors[key] = error
    const pathKey = basePath ? `${basePath}.${key}` : key
    validationCtx?.registerError(pathKey, error)
    if (error) {
      registeredKeys.add(pathKey)
    } else {
      registeredKeys.delete(pathKey)
    }
  }

  function addEntry(key: string) {
    if (!key.trim() || entries.some(([k]) => k === key)) return
    const newValue = {
      ...((value as Record<string, unknown>) ?? {}),
      [key]: defaultValue(valueSchema),
    }
    onChange(path, newValue)
    newKeyInput = ''
  }

  function removeEntry(key: string) {
    const newValue = { ...((value as Record<string, unknown>) ?? {}) }
    delete newValue[key]
    onChange(path, newValue)

    const pathKey = basePath ? `${basePath}.${key}` : key
    validationCtx?.unregisterField(pathKey)
    registeredKeys.delete(pathKey)
    delete errors[key]
  }

  function renameEntry(oldKey: string, newKey: string) {
    if (!newKey.trim() || oldKey === newKey || entries.some(([k]) => k === newKey)) {
      keyInputs[oldKey] = oldKey
      return
    }

    pendingRenames.set(oldKey, newKey)
    delete keyInputs[oldKey]
    keyInputs[newKey] = newKey

    onChange(path, renameRecordKey((value as Record<string, unknown>) ?? {}, oldKey, newKey))

    const oldPathKey = basePath ? `${basePath}.${oldKey}` : oldKey
    validationCtx?.unregisterField(oldPathKey)
    registeredKeys.delete(oldPathKey)

    if (errors[oldKey]) {
      const oldError = errors[oldKey]
      delete errors[oldKey]
      setError(newKey, oldError)
    }
  }

  function handleValueInput(key: string, inputValue: string) {
    if (!isNumeric) {
      const result = validateValue(valueSchema, inputValue)
      setError(key, result.error)
      onChange([...path, key], inputValue)
      return
    }

    if (inputValue === '') {
      setError(key, null)
      onChange([...path, key], undefined)
      return
    }

    const num = parseNumber(inputValue)
    if (num === undefined) {
      setError(key, 'Must be a valid number')
      return
    }

    const result = validateValue(valueSchema, num)
    setError(key, result.error)

    if (result.valid) {
      onChange([...path, key], num)
    }
  }
</script>

<Field.Field>
  <Field.Label>
    {label}
    {#if description}
      <Field.Hint>({description})</Field.Hint>
    {/if}
  </Field.Label>
  <div class="flex flex-col gap-2">
    {#each entries as [key, val] (key)}
      {@const error = errors[key]}
      <Field.Field data-invalid={!!error || undefined}>
        <div class="flex items-center gap-2">
          {#if keyEnumValues}
            <span class="w-32 font-mono text-sm text-foreground-l2">{key}</span>
          {:else}
            <Input
              type="text"
              class="w-32 font-mono text-sm"
              bind:value={keyInputs[key]}
              onblur={() => renameEntry(key, keyInputs[key] ?? key)}
              {disabled} />
          {/if}
          <span class="text-foreground-l4">=</span>
          {#if valueSchema.type === 'boolean'}
            <Select.Root
              type="single"
              value={String(val ?? false)}
              onValueChange={v => onChange([...path, key], v === 'true')}
              {disabled}>
              <Select.Trigger class="flex-1">{val ? 'true' : 'false'}</Select.Trigger>
              <Select.Content>
                <Select.Item value="true" label="true">true</Select.Item>
                <Select.Item value="false" label="false">false</Select.Item>
              </Select.Content>
            </Select.Root>
          {:else}
            <Input
              type="text"
              inputmode={isNumeric ? 'decimal' : 'text'}
              class="flex-1 font-mono text-sm"
              value={String(val ?? '')}
              oninput={e => handleValueInput(key, e.currentTarget.value)}
              aria-invalid={!!error}
              {disabled} />
          {/if}
          {#if !disabled}
            <Button
              type="button"
              size="icon"
              variant="destructive"
              onclick={() => removeEntry(key)}>
              <IconX class="size-4" />
            </Button>
          {/if}
        </div>
        {#if error}
          <Field.Error>{error}</Field.Error>
        {/if}
      </Field.Field>
    {/each}
    <Field.Field data-invalid={isDuplicateKey || undefined}>
      <div class="flex items-center gap-2">
        {#if keyEnumValues}
          <Select.Root
            type="single"
            value={selectedKey}
            onValueChange={v => (selectedKey = v)}
            disabled={disabled || availableKeys.length === 0}>
            <Select.Trigger class="w-32 font-mono text-sm">
              {selectedKey || 'Select key...'}
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
            class="w-32 font-mono text-sm"
            placeholder="new key"
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
        <span class="text-foreground-l4">=</span>
        <Button
          size="sm"
          onclick={() => {
            if (keyEnumValues) {
              if (selectedKey) {
                addEntry(selectedKey)
                selectedKey = ''
              }
            } else {
              addEntry(newKeyInput.trim())
            }
          }}
          disabled={disabled ||
            (keyEnumValues ? !selectedKey : !newKeyInput.trim() || isDuplicateKey)}>
          <IconPlus class="size-4" />
          Add
        </Button>
      </div>
      {#if isDuplicateKey}
        <Field.Error>Key already exists</Field.Error>
      {/if}
    </Field.Field>
  </div>
</Field.Field>
