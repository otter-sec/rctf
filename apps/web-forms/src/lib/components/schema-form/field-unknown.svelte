<script lang="ts">
  import type { FieldProps } from './types'

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

  const label = $derived(schema.title ?? path[path.length - 1] ?? '')
  const description = $derived(schema.description)

  function set(v: unknown) {
    onChange(path, v)
  }
</script>

<div>
  {#if showLabel && label}
    <div>
      <strong>{label}</strong>{#if required}*{/if}
      {#if description}
        <small>({description})</small>
      {/if}
    </div>
  {/if}

  <input
    type="text"
    value={JSON.stringify(value ?? '')}
    oninput={e => {
      try {
        set(JSON.parse(e.currentTarget.value))
      } catch {
        set(e.currentTarget.value)
      }
    }}
    {disabled} />
</div>
