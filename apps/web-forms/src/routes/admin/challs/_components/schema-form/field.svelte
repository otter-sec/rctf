<script lang="ts">
  import Array from './array.svelte'
  import FieldBoolean from './field-boolean.svelte'
  import FieldNumber from './field-number.svelte'
  import FieldString from './field-string.svelte'
  import FieldUnknown from './field-unknown.svelte'
  import Object from './object.svelte'
  import Record from './record.svelte'
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
  <Record schema={effectiveSchema} {value} {path} {onChange} {disabled} />
{:else if primaryType === 'object' && effectiveSchema.properties}
  <Object schema={effectiveSchema} {value} {path} {onChange} {disabled} {showLabel} {isNullable} />
{:else if primaryType === 'array'}
  <Array schema={effectiveSchema} {value} {path} {onChange} {disabled} />
{:else if primaryType === 'string' || effectiveSchema.enum}
  <FieldString
    schema={effectiveSchema}
    {value}
    {path}
    {onChange}
    {disabled}
    {showLabel}
    {required}
  />
{:else if primaryType === 'number' || primaryType === 'integer'}
  <FieldNumber
    schema={effectiveSchema}
    {value}
    {path}
    {onChange}
    {disabled}
    {showLabel}
    {required}
  />
{:else if primaryType === 'boolean'}
  <FieldBoolean
    schema={effectiveSchema}
    {value}
    {path}
    {onChange}
    {disabled}
    {showLabel}
    {required}
  />
{:else}
  <FieldUnknown
    schema={effectiveSchema}
    {value}
    {path}
    {onChange}
    {disabled}
    {showLabel}
    {required}
  />
{/if}
