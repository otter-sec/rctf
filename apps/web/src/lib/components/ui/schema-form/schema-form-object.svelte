<script lang="ts">
  import { Button, Section } from '$lib/components'
  import SchemaFormField from './schema-form-field.svelte'
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
  <Section.Root>
    <Section.Header class="flex items-center justify-between">
      <span>{label || 'Object'}</span>
      <Button size="sm" onclick={enableObject} {disabled}>Enable</Button>
    </Section.Header>
    <Section.Content>
      <p class="text-sm text-foreground-l4">Not configured</p>
    </Section.Content>
  </Section.Root>
{:else if showLabel && label && path.length > 0}
  <Section.Root>
    <Section.Header class="flex items-center justify-between">
      <span>{label}</span>
      {#if isNullable}
        <Button size="sm" variant="ghost" onclick={disableObject} {disabled}>Disable</Button>
      {/if}
    </Section.Header>
    <Section.Content class="flex flex-col gap-3">
      {#each entries as [key, propSchema]}
        <SchemaFormField
          schema={propSchema}
          value={obj[key]}
          path={[...path, key]}
          {onChange}
          {disabled}
          required={requiredFields.has(key)} />
      {/each}
    </Section.Content>
  </Section.Root>
{:else}
  <div class="flex flex-col gap-3">
    {#each entries as [key, propSchema]}
      <SchemaFormField
        schema={propSchema}
        value={obj[key]}
        path={[...path, key]}
        {onChange}
        {disabled}
        required={requiredFields.has(key)} />
    {/each}
  </div>
{/if}
