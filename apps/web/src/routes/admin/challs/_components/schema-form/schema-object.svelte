<script lang="ts">
  import { Section } from '$lib/components'
  import SchemaField from './schema-field.svelte'
  import type { JsonSchema } from './types'

  interface Props {
    schema: JsonSchema
    value: unknown
    path: string[]
    onChange: (path: string[], value: unknown) => void
    disabled?: boolean
    showLabel?: boolean
  }

  let { schema, value, path, onChange, disabled = false, showLabel = true }: Props = $props()

  const obj = $derived((value ?? {}) as Record<string, unknown>)
  const entries = $derived(Object.entries(schema.properties ?? {}))
  const requiredFields = $derived(new Set(schema.required ?? []))
  const label = $derived(schema.title ?? path[path.length - 1] ?? '')
</script>

{#if showLabel && label && path.length > 0}
  <Section.Root>
    <Section.Header>{label}</Section.Header>
    <Section.Content class="flex flex-col gap-3">
      {#each entries as [key, propSchema]}
        <SchemaField
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
      <SchemaField
        schema={propSchema}
        value={obj[key]}
        path={[...path, key]}
        {onChange}
        {disabled}
        required={requiredFields.has(key)} />
    {/each}
  </div>
{/if}
