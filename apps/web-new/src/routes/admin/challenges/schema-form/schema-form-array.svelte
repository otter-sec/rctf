<script lang="ts">
  import SchemaFormArrayPanel from './schema-form-array-panel.svelte'
  import SchemaFormArrayTags from './schema-form-array-tags.svelte'
  import type { FieldProps, JsonSchema } from './types'
  import { isTypeOneOf } from './utils'

  interface Props extends FieldProps {}

  let { schema, value, path, onChange, onError, disabled = false }: Props = $props()

  const itemSchema = $derived(schema.items ?? ({ type: 'string' } as JsonSchema))
  const isPrimitive = $derived(isTypeOneOf(itemSchema.type, ['string', 'number', 'integer']))
</script>

{#if isPrimitive}
  <SchemaFormArrayTags {schema} {value} {path} {onChange} {onError} {disabled} />
{:else}
  <SchemaFormArrayPanel {schema} {value} {path} {onChange} {onError} {disabled} />
{/if}
