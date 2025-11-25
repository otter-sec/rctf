<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  let {
    loading = false,
    children,
    ...buttonProps
  }: HTMLButtonAttributes & {
    loading?: boolean
    children: Snippet
  } = $props()
</script>

<button disabled={loading} {...buttonProps}>
  {#if loading}
    <span class="inline-flex items-center gap-2">
      <span aria-hidden="true">⏳</span>
      {@render children()}
    </span>
  {:else}
    {@render children()}
  {/if}
</button>
