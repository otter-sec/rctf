<script lang="ts">
  import type { FieldProps, JsonSchema } from '../types'
  import ArrayPanel from './array-panel.svelte'
  import ArrayTags from './array-tags.svelte'

  interface Props extends FieldProps {}

  let { schema, value, path, onChange, disabled = false }: Props = $props()

  const itemSchema = $derived(schema.items ?? ({ type: 'string' } as JsonSchema))
  const isPrimitive = $derived(['string', 'number', 'integer'].includes(itemSchema.type ?? ''))
</script>

{#if isPrimitive}
  <ArrayTags {schema} {value} {path} {onChange} {disabled} />
{:else}
  <ArrayPanel {schema} {value} {path} {onChange} {disabled} />
{/if}
