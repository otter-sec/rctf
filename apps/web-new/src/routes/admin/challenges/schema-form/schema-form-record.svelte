<script lang="ts">
  import SchemaFormRecordInline from './schema-form-record-inline.svelte'
  import SchemaFormRecordList from './schema-form-record-list.svelte'
  import type { FieldProps, JsonSchema } from './types'
  import { isTypeOneOf } from './utils'

  interface Props extends FieldProps {}

  let { schema, value, path, onChange, onSelect, disabled = false }: Props = $props()

  const valueSchema = $derived(
    (typeof schema.additionalProperties === 'object'
      ? schema.additionalProperties
      : { type: 'string' }) as JsonSchema
  )
  const isSimpleValue = $derived(
    isTypeOneOf(valueSchema.type, ['string', 'number', 'integer', 'boolean'])
  )
</script>

{#if isSimpleValue}
  <SchemaFormRecordInline {schema} {value} {path} {onChange} {disabled} />
{:else}
  <SchemaFormRecordList
    {schema}
    {value}
    {path}
    {onChange}
    onOpen={entryPath => onSelect?.(entryPath)}
    onAdded={entryPath => onSelect?.(entryPath)}
    {disabled}
  />
{/if}
