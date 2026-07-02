<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements'

  type Props = HTMLTextareaAttributes

  let { value = $bindable(), ...rest }: Props = $props()
</script>

<textarea bind:value {...rest}></textarea>

<style>
  textarea {
    display: block;
    inline-size: 100%;
    min-block-size: 4.5rem;
    padding: var(--space-3xs) var(--space-2xs);
    color: var(--foreground-l0);
    background: var(--background-l4);
    border: 2px solid transparent;
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
