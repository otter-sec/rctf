<script lang="ts">
  import SchemaArray from './array.svelte'
  import BooleanField from './field-boolean.svelte'
  import NumberField from './field-number.svelte'
  import StringField from './field-string.svelte'
  import UnknownField from './field-unknown.svelte'
  import SchemaObject from './object.svelte'
  import SchemaRecord from './record.svelte'
  import type { JsonSchema } from './types'
  import { isNullable as checkNullable, getEffectiveSchema, getPrimaryType } from './utils'

  interface Props {
    schema: JsonSchema
    value: unknown
    path: string[]
    onChange: (path: string[], value: unknown) => void
    disabled?: boolean
    showLabel?: boolean
    required?: boolean
  }

  let {
    schema,
    value,
    path,
    onChange,
    disabled = false,
    showLabel = true,
    required = false,
  }: Props = $props()

  const effectiveSchema = $derived(getEffectiveSchema(schema))
  const primaryType = $derived(getPrimaryType(schema))
  const isNullable = $derived(checkNullable(schema))

  const isRecord = $derived(
    primaryType === 'object' && !effectiveSchema.properties && effectiveSchema.additionalProperties
  )
</script>

{#if isRecord}
  <SchemaRecord schema={effectiveSchema} {value} {path} {onChange} {disabled} />
{:else if primaryType === 'object' && effectiveSchema.properties}
  <SchemaObject
    schema={effectiveSchema}
    {value}
    {path}
    {onChange}
    {disabled}
    {showLabel}
    {isNullable} />
{:else if primaryType === 'array'}
  <SchemaArray schema={effectiveSchema} {value} {path} {onChange} {disabled} />
{:else if primaryType === 'string' || effectiveSchema.enum}
  <StringField
    schema={effectiveSchema}
    {value}
    {path}
    {onChange}
    {disabled}
    {showLabel}
    {required} />
{:else if primaryType === 'number' || primaryType === 'integer'}
  <NumberField
    schema={effectiveSchema}
    {value}
    {path}
    {onChange}
    {disabled}
    {showLabel}
    {required} />
{:else if primaryType === 'boolean'}
  <BooleanField
    schema={effectiveSchema}
    {value}
    {path}
    {onChange}
    {disabled}
    {showLabel}
    {required} />
{:else}
  <UnknownField
    schema={effectiveSchema}
    {value}
    {path}
    {onChange}
    {disabled}
    {showLabel}
    {required} />
{/if}
