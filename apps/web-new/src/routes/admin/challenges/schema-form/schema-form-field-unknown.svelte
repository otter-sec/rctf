<script lang="ts">
  import Field from '$lib/ui/field.svelte'
  import Input from '$lib/ui/input.svelte'
  import { getSchemaFormErrors, NO_FIELD_ERROR, type FieldProps } from './types'
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

  const errorsContext = getSchemaFormErrors()

  const label = $derived(fieldLabel(schema, path))
  const description = $derived(schema.description)

  const { error, incomplete } = $derived(errorsContext?.display(path) ?? NO_FIELD_ERROR)

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
  label={showLabel && label ? label : undefined}
  required={showLabel && required}
  hint={showLabel ? description : undefined}
  {error}
  {incomplete}
>
  {#snippet children({ id, describedBy })}
    <Input
      {id}
      aria-describedby={describedBy}
      type="text"
      value={JSON.stringify(value ?? '')}
      oninput={handleInput}
      aria-invalid={error && !incomplete ? 'true' : undefined}
      data-incomplete={incomplete ? '' : undefined}
      {disabled}
    />
  {/snippet}
</Field>
