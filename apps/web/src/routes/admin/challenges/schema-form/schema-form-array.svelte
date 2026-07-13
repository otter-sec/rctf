<script lang="ts">
  import SchemaFormArrayList from './schema-form-array-list.svelte'
  import SchemaFormArrayTags from './schema-form-array-tags.svelte'
  import { classifyHeavy } from './tree'
  import type { FieldProps } from './types'

  interface Props extends FieldProps {}

  let { schema, value, path, onChange, onSelect, disabled = false }: Props = $props()

  const isPrimitive = $derived(classifyHeavy(schema) !== 'array')
</script>

{#if isPrimitive}
  <SchemaFormArrayTags {schema} {value} {path} {onChange} {disabled} />
{:else}
  <SchemaFormArrayList
    {schema}
    {value}
    {path}
    {onChange}
    onOpen={entryPath => onSelect?.(entryPath)}
    onAdded={entryPath => onSelect?.(entryPath)}
    {disabled}
  />
{/if}
