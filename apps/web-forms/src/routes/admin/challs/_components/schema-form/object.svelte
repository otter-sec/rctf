<script lang="ts">
  import Field from './field.svelte'
  import type { JsonSchema } from './types'
  import { defaultValue } from './utils'

  interface Props {
    schema: JsonSchema
    value: unknown
    path: string[]
    onChange: (path: string[], value: unknown) => void
    disabled?: boolean
    showLabel?: boolean
    isNullable?: boolean
  }

  let {
    schema,
    value,
    path,
    onChange,
    disabled = false,
    showLabel = true,
    isNullable = false,
  }: Props = $props()

  const isNull = $derived(value === null || value === undefined)
  const obj = $derived((value ?? {}) as Record<string, unknown>)
  const entries = $derived(Object.entries(schema.properties ?? {}))
  const requiredFields = $derived(new Set(schema.required ?? []))
  const label = $derived(schema.title ?? path[path.length - 1] ?? '')

  function enableObject() {
    onChange(path, defaultValue(schema))
  }

  function disableObject() {
    onChange(path, null)
  }
</script>

{#if isNullable && isNull}
  <fieldset>
    <legend>{label || 'Object'}</legend>
    <p>Not configured</p>
    <button type="button" onclick={enableObject} {disabled}>Enable</button>
  </fieldset>
{:else if showLabel && label && path.length > 0}
  <fieldset>
    <legend>
      {label}
      {#if isNullable}
        <button type="button" onclick={disableObject} {disabled}>Disable</button>
      {/if}
    </legend>
    {#each entries as [key, propSchema]}
      <Field
        schema={propSchema}
        value={obj[key]}
        path={[...path, key]}
        {onChange}
        {disabled}
        required={requiredFields.has(key)} />
    {/each}
  </fieldset>
{:else}
  <div>
    {#each entries as [key, propSchema]}
      <Field
        schema={propSchema}
        value={obj[key]}
        path={[...path, key]}
        {onChange}
        {disabled}
        required={requiredFields.has(key)} />
    {/each}
  </div>
{/if}
