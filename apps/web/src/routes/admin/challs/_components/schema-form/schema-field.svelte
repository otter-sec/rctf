<script lang="ts">
  import SchemaArray from './array/schema-array.svelte'
  import BooleanField from './primitives/boolean-field.svelte'
  import NumberField from './primitives/number-field.svelte'
  import StringField from './primitives/string-field.svelte'
  import UnknownField from './primitives/unknown-field.svelte'
  import SchemaRecord from './record/schema-record.svelte'
  import SchemaObject from './schema-object.svelte'
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

  const isRecord = $derived(
    schema.type === 'object' && !schema.properties && schema.additionalProperties
  )
</script>

{#if isRecord}
  <SchemaRecord {schema} {value} {path} {onChange} {disabled} />
{:else if schema.type === 'object' && schema.properties}
  <SchemaObject {schema} {value} {path} {onChange} {disabled} {showLabel} />
{:else if schema.type === 'array'}
  <SchemaArray {schema} {value} {path} {onChange} {disabled} />
{:else if schema.type === 'string'}
  <StringField {schema} {value} {path} {onChange} {disabled} {showLabel} />
{:else if schema.type === 'number' || schema.type === 'integer'}
  <NumberField {schema} {value} {path} {onChange} {disabled} {showLabel} />
{:else if schema.type === 'boolean'}
  <BooleanField {schema} {value} {path} {onChange} {disabled} {showLabel} />
{:else}
  <UnknownField {schema} {value} {path} {onChange} {disabled} {showLabel} />
{/if}
