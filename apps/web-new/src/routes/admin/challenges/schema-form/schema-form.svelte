<script lang="ts">
  import { SvelteMap } from 'svelte/reactivity'
  import SchemaFormField from './schema-form-field.svelte'
  import type { JsonSchema } from './types'
  import { collectDefs, resolveRefs, setValueAtPath } from './utils'

  interface Props {
    schema: JsonSchema
    value: Record<string, unknown>
    onChange: (next: Record<string, unknown>) => void
    valid?: boolean
    disabled?: boolean
  }

  let { schema, value, onChange, valid = $bindable(true), disabled = false }: Props = $props()

  // Runes error registry, owned by the root: leaf fields report (pathKey, error)
  // up through `reportError`; a null error clears the entry. Replaces the old
  // Svelte-context registry.
  const errors = new SvelteMap<string, string>()

  function reportError(pathKey: string, error: string | null) {
    if (error) errors.set(pathKey, error)
    else errors.delete(pathKey)
    valid = errors.size === 0
  }

  const resolvedSchema = $derived(resolveRefs(schema, collectDefs(schema)))

  function handleChange(path: string[], newValue: unknown) {
    onChange(setValueAtPath(value, path, newValue) as Record<string, unknown>)
  }
</script>

{#if resolvedSchema.properties}
  <SchemaFormField
    schema={resolvedSchema}
    {value}
    path={[]}
    onChange={handleChange}
    onError={reportError}
    {disabled}
    showLabel={false}
  />
{:else}
  <schema-form-empty>Schema has no properties to render</schema-form-empty>
{/if}

<style>
  schema-form-empty {
    display: block;
    color: var(--foreground-l4);
    font-size: var(--step--1);
  }
</style>
