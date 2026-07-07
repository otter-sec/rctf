<script lang="ts">
  import Field from '$lib/ui/field.svelte'
  import Input from '$lib/ui/input.svelte'
  import { getContext } from 'svelte'
  import { SCHEMA_FORM_ERRORS_KEY, type FieldProps, type SchemaFormErrorsContext } from './types'
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

  const errorsContext = getContext<SchemaFormErrorsContext | undefined>(SCHEMA_FORM_ERRORS_KEY)

  const label = $derived(fieldLabel(schema, path))
  const description = $derived(schema.description)

  const finding = $derived(errorsContext?.get(path) ?? null)
  const error = $derived(finding?.message ?? null)
  const incomplete = $derived(finding?.severity === 'missing')

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
