<script lang="ts">
  import type { FieldProps, JsonSchema } from '../types'
  import RecordInline from './record-inline.svelte'
  import RecordPanel from './record-panel.svelte'

  interface Props extends FieldProps {}

  let { schema, value, path, onChange, disabled = false }: Props = $props()

  const valueSchema = $derived(
    (typeof schema.additionalProperties === 'object'
      ? schema.additionalProperties
      : { type: 'string' }) as JsonSchema
  )
  const isSimpleValue = $derived(
    ['string', 'number', 'integer', 'boolean'].includes(valueSchema.type ?? '')
  )
</script>

{#if isSimpleValue}
  <RecordInline {schema} {value} {path} {onChange} {disabled} />
{:else}
  <RecordPanel {schema} {value} {path} {onChange} {disabled} />
{/if}
