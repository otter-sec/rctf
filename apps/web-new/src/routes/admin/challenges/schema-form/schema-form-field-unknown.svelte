<script lang="ts">
  import Field from '$lib/ui/field.svelte'
  import Input from '$lib/ui/input.svelte'
  import type { FieldProps } from './types'
  import { fieldLabel } from './utils'

  interface Props extends FieldProps {
    showLabel?: boolean
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

  const label = $derived(fieldLabel(schema, path))
  const description = $derived(schema.description)

  function handleInput(event: Event) {
    const raw = (event.currentTarget as HTMLInputElement).value
    try {
      onChange(path, JSON.parse(raw))
    } catch {
      onChange(path, raw)
    }
  }
</script>

<Field
  label={showLabel && label ? `${label}${required ? ' *' : ''}` : undefined}
  description={showLabel ? description : undefined}
>
  {#snippet children({ id, describedBy })}
    <Input
      {id}
      aria-describedby={describedBy}
      type="text"
      value={JSON.stringify(value ?? '')}
      oninput={handleInput}
      {disabled}
    />
  {/snippet}
</Field>
