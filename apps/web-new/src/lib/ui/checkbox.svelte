<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLInputAttributes } from 'svelte/elements'

  type Props = Omit<HTMLInputAttributes, 'type' | 'checked'> & {
    checked?: boolean
    children?: Snippet
  }

  let { checked = $bindable(false), children, ...rest }: Props = $props()
</script>

{#if children}
  <label>
    <input type="checkbox" bind:checked {...rest} />
    {@render children()}
  </label>
{:else}
  <input type="checkbox" bind:checked {...rest} />
{/if}

<style>
  label {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2xs);
    cursor: pointer;
  }

  input {
    inline-size: 1rem;
    block-size: 1rem;
    accent-color: var(--background-accent);
    cursor: pointer;
  }
</style>
