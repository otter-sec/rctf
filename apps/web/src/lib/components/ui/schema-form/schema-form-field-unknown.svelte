<script lang="ts">
  import { Field, Input } from '$lib/components'
  import type { SchemaFormFieldProps } from './types'

  interface Props extends SchemaFormFieldProps {
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

  const label = $derived(schema.title ?? path[path.length - 1] ?? '')
  const description = $derived(schema.description)

  function set(v: unknown) {
    onChange(path, v)
  }
</script>

<Field.Field>
  {#if showLabel && label}
    <Field.Label>
      {label}{#if required}<span class="text-foreground-destructive -ms-1.5">*</span>{/if}
      {#if description}
        <Field.Hint>({description})</Field.Hint>
      {/if}
    </Field.Label>
  {/if}

  <Input
    type="text"
    value={JSON.stringify(value ?? '')}
    oninput={e => {
      try {
        set(JSON.parse(e.currentTarget.value))
      } catch {
        set(e.currentTarget.value)
      }
    }}
    {disabled}
  />
</Field.Field>
