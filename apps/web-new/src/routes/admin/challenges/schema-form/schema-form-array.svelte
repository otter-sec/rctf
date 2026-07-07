<script lang="ts">
  import SchemaFormArrayList from './schema-form-array-list.svelte'
  import SchemaFormArrayTags from './schema-form-array-tags.svelte'
  import type { FieldProps, JsonSchema } from './types'
  import { arrayItemSchema, isTypeOneOf } from './utils'

  interface Props extends FieldProps {}

  let { schema, value, path, onChange, onSelect, disabled = false }: Props = $props()

  const itemSchema = $derived(arrayItemSchema(schema))
  const isPrimitive = $derived(isTypeOneOf(itemSchema.type, ['string', 'number', 'integer']))
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
