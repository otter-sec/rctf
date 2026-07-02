<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements'

  type Props = HTMLInputAttributes

  let { value = $bindable(), ...rest }: Props = $props()
</script>

<input bind:value {...rest} />

<style>
  input {
    display: block;
    inline-size: 100%;
    block-size: 2.25rem;
    padding-inline: var(--space-2xs);
    color: var(--foreground-l0);
    background: var(--background-l1);
    border: 2px solid var(--border);
    border-radius: var(--radius-md);

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: -1px;
    }

    &[aria-invalid='true'] {
      border-color: var(--foreground-destructive);
    }
  }
</style>
