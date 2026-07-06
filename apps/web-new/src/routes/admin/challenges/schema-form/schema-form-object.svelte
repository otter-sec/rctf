<script lang="ts">
  import Button from '$lib/ui/button.svelte'
  import SchemaFormField from './schema-form-field.svelte'
  import type { FieldProps } from './types'
  import { defaultValue } from './utils'

  interface Props extends FieldProps {
    showLabel?: boolean
    isNullable?: boolean
  }

  let {
    schema,
    value,
    path,
    onChange,
    onError,
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

{#snippet fields()}
  {#each entries as [key, propSchema] (key)}
    <SchemaFormField
      schema={propSchema}
      value={obj[key]}
      path={[...path, key]}
      {onChange}
      {onError}
      {disabled}
      required={requiredFields.has(key)}
    />
  {/each}
{/snippet}

{#if isNullable && isNull}
  <sf-section>
    <sf-section-header>
      <span>{label || 'Object'}</span>
      <Button size="sm" onclick={enableObject} {disabled}>Enable</Button>
    </sf-section-header>
    <sf-section-content>
      <sf-empty>Not configured</sf-empty>
    </sf-section-content>
  </sf-section>
{:else if showLabel && label && path.length > 0}
  <sf-section>
    <sf-section-header>
      <span>{label}</span>
      {#if isNullable}
        <Button size="sm" variant="ghost" onclick={disableObject} {disabled}>Disable</Button>
      {/if}
    </sf-section-header>
    <sf-section-content>
      {@render fields()}
    </sf-section-content>
  </sf-section>
{:else}
  <sf-fields>
    {@render fields()}
  </sf-fields>
{/if}

<style>
  sf-section {
    display: block;
    overflow: clip;
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
  }

  sf-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2xs);
    padding: 0.375rem 1rem;
    color: var(--foreground-l3);
    background: var(--background-l3);
  }

  sf-section-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    padding: var(--space-s) 1rem;
  }

  sf-fields {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  sf-empty {
    color: var(--foreground-l4);
    font-size: var(--step--1);
  }
</style>
