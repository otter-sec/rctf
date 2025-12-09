<script lang="ts">
  import SchemaFormRecordInline from './schema-form-record-inline.svelte'
  import SchemaFormRecordPanel from './schema-form-record-panel.svelte'
  import type { SchemaFormFieldProps, JsonSchema } from './types'
  import { isTypeOneOf } from './utils'

  interface Props extends SchemaFormFieldProps {}

  let { schema, value, path, onChange, disabled = false }: Props = $props()

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
  <SchemaFormRecordPanel {schema} {value} {path} {onChange} {disabled} />
{/if}
