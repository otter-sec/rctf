<script lang="ts">
  import SchemaFormArray from './schema-form-array.svelte'
  import SchemaFormFieldBoolean from './schema-form-field-boolean.svelte'
  import SchemaFormFieldNumber from './schema-form-field-number.svelte'
  import SchemaFormFieldString from './schema-form-field-string.svelte'
  import SchemaFormFieldUnknown from './schema-form-field-unknown.svelte'
  import SchemaFormObject from './schema-form-object.svelte'
  import SchemaFormRecord from './schema-form-record.svelte'
  import type { FieldProps } from './types'
  import { isNullable as checkNullable, getEffectiveSchema, getPrimaryType } from './utils'

  interface Props extends FieldProps {
    showLabel?: boolean
  }

  let {
    schema,
    value,
    path,
    onChange,
    onError,
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
  <SchemaFormRecord schema={effectiveSchema} {value} {path} {onChange} {onError} {disabled} />
{:else if primaryType === 'object' && effectiveSchema.properties}
  <SchemaFormObject
    schema={effectiveSchema}
    {value}
    {path}
    {onChange}
    {onError}
    {disabled}
    {showLabel}
    {isNullable}
  />
{:else if primaryType === 'array'}
  <SchemaFormArray schema={effectiveSchema} {value} {path} {onChange} {onError} {disabled} />
{:else if primaryType === 'string' || effectiveSchema.enum}
  <SchemaFormFieldString
    schema={effectiveSchema}
    {value}
    {path}
    {onChange}
    {onError}
    {disabled}
    {showLabel}
    {required}
  />
{:else if primaryType === 'number' || primaryType === 'integer'}
  <SchemaFormFieldNumber
    schema={effectiveSchema}
    {value}
    {path}
    {onChange}
    {onError}
    {disabled}
    {showLabel}
    {required}
  />
{:else if primaryType === 'boolean'}
  <SchemaFormFieldBoolean
    schema={effectiveSchema}
    {value}
    {path}
    {onChange}
    {onError}
    {disabled}
    {showLabel}
    {required}
  />
{:else}
  <SchemaFormFieldUnknown
    schema={effectiveSchema}
    {value}
    {path}
    {onChange}
    {onError}
    {disabled}
    {showLabel}
    {required}
  />
{/if}
