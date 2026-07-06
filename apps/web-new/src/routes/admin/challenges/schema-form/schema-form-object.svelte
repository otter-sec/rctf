<script lang="ts">
  import Button from '$lib/ui/button.svelte'
  import SchemaFormField from './schema-form-field.svelte'
  import type { FieldProps } from './types'
  import { defaultValue } from './utils'

  interface Props extends FieldProps {
    isNullable?: boolean
  }

  let {
    schema,
    value,
    path,
    onChange,
    onError,
    onNavigate,
    disabled = false,
    isNullable = false,
  }: Props = $props()

  const isNull = $derived(value === null || value === undefined)
  const obj = $derived((value ?? {}) as Record<string, unknown>)
  const entries = $derived(Object.entries(schema.properties ?? {}))
  const requiredFields = $derived(new Set(schema.required ?? []))

  function enableObject() {
    onChange(path, defaultValue(schema))
  }

  function disableObject() {
    onChange(path, null)
  }
</script>

{#if isNullable && isNull}
  <sf-nullable>
    <sf-empty>Not configured</sf-empty>
    <Button size="sm" onclick={enableObject} {disabled}>Enable</Button>
  </sf-nullable>
{:else}
  <sf-fields>
    {#each entries as [key, propSchema] (key)}
      <SchemaFormField
        schema={propSchema}
        value={obj[key]}
        path={[...path, key]}
        {onChange}
        {onError}
        {onNavigate}
        {disabled}
        required={requiredFields.has(key)}
      />
    {/each}
    {#if isNullable}
      <sf-nullable-actions>
        <Button size="sm" variant="ghost" onclick={disableObject} {disabled}>Disable</Button>
      </sf-nullable-actions>
    {/if}
  </sf-fields>
{/if}

<style>
  sf-fields {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  sf-nullable {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
  }

  sf-nullable-actions {
    display: flex;
  }

  sf-empty {
    color: var(--foreground-l4);
    font-size: var(--step--1);
  }
</style>
