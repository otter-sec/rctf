<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements'

  let {
    label,
    error,
    value = $bindable(''),
    ...inputProps
  }: HTMLInputAttributes & {
    label: string
    error?: string
    value?: string
  } = $props()
</script>

<label class="flex flex-col gap-1">
  <span>{label}</span>
  <input bind:value {...inputProps} />
  {#if error}
    <span role="alert">{error}</span>
  {/if}
</label>
