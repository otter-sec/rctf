<script lang="ts">
  import ArrayPanel from './array-panel.svelte'
  import ArrayTags from './array-tags.svelte'
  import type { FieldProps, JsonSchema } from './types'
  import { isTypeOneOf } from './utils'

  interface Props extends FieldProps {}

  let { schema, value, path, onChange, disabled = false }: Props = $props()

  const itemSchema = $derived(schema.items ?? ({ type: 'string' } as JsonSchema))
  const isPrimitive = $derived(isTypeOneOf(itemSchema.type, ['string', 'number', 'integer']))
</script>

{#if isPrimitive}
  <ArrayTags {schema} {value} {path} {onChange} {disabled} />
{:else}
  <ArrayPanel {schema} {value} {path} {onChange} {disabled} />
{/if}
