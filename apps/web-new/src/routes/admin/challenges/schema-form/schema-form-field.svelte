<script lang="ts">
  import SchemaFormArray from './schema-form-array.svelte'
  import SchemaFormFieldBoolean from './schema-form-field-boolean.svelte'
  import SchemaFormFieldNumber from './schema-form-field-number.svelte'
  import SchemaFormFieldString from './schema-form-field-string.svelte'
  import SchemaFormFieldUnknown from './schema-form-field-unknown.svelte'
  import SchemaFormObject from './schema-form-object.svelte'
  import SchemaFormRecord from './schema-form-record.svelte'
  import SchemaFormSummaryRow from './schema-form-summary-row.svelte'
  import type { FieldProps, JsonSchema } from './types'
  import {
    isNullable as checkNullable,
    getEffectiveSchema,
    getPrimaryType,
    isTypeOneOf,
    recordValueSchema,
  } from './utils'

  interface Props extends FieldProps {
    showLabel?: boolean
    root?: boolean
  }

  let {
    schema,
    value,
    path,
    onChange,
    onError,
    onNavigate,
    disabled = false,
    showLabel = true,
    required = false,
    root = false,
  }: Props = $props()

  const effectiveSchema = $derived(getEffectiveSchema(schema))
  const primaryType = $derived(getPrimaryType(schema))
  const isNullable = $derived(checkNullable(schema))

  const isRecord = $derived(
    primaryType === 'object' && !effectiveSchema.properties && effectiveSchema.additionalProperties
  )

  const isDrillTarget = $derived.by(() => {
    if (isRecord) {
      return !isTypeOneOf(recordValueSchema(effectiveSchema).type, [
        'string',
        'number',
        'integer',
        'boolean',
      ])
    }
    if (primaryType === 'object') return Boolean(effectiveSchema.properties)
    if (primaryType === 'array') {
      const itemSchema = effectiveSchema.items ?? ({ type: 'string' } as JsonSchema)
      return !isTypeOneOf(itemSchema.type, ['string', 'number', 'integer'])
    }
    return false
  })
</script>

{#if !root && isDrillTarget && onNavigate}
  <SchemaFormSummaryRow
    schema={effectiveSchema}
    {value}
    {path}
    {required}
    {isNullable}
    {onNavigate}
  />
{:else if isRecord}
  <SchemaFormRecord
    schema={effectiveSchema}
    {value}
    {path}
    {onChange}
    {onError}
    {onNavigate}
    {disabled}
  />
{:else if primaryType === 'object' && effectiveSchema.properties}
  <SchemaFormObject
    schema={effectiveSchema}
    {value}
    {path}
    {onChange}
    {onError}
    {onNavigate}
    {disabled}
    {isNullable}
  />
{:else if primaryType === 'array'}
  <SchemaFormArray
    schema={effectiveSchema}
    {value}
    {path}
    {onChange}
    {onError}
    {onNavigate}
    {disabled}
  />
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
