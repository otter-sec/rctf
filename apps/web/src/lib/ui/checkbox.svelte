<script lang="ts">
  import { IconCheck } from '$lib/icons'
  import type { Snippet } from 'svelte'
  import type { HTMLInputAttributes } from 'svelte/elements'

  type Props = Omit<HTMLInputAttributes, 'type' | 'checked'> & {
    checked?: boolean
    children?: Snippet
  }

  let { checked = $bindable(false), children, ...rest }: Props = $props()
</script>

{#snippet control()}
  <check-control>
    <input type="checkbox" bind:checked {...rest} />
    <check-box aria-hidden="true"><IconCheck /></check-box>
  </check-control>
{/snippet}

{#if children}
  <label>
    {@render control()}
    {@render children()}
  </label>
{:else}
  {@render control()}
{/if}

<style>
  label {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2xs);
    cursor: pointer;
  }

  check-control {
    position: relative;
    display: inline-flex;
    flex-shrink: 0;
  }

  input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  check-box {
    display: flex;
    align-items: center;
    justify-content: center;
    inline-size: 1rem;
    block-size: 1rem;
    color: var(--background-l1);
    border: 2px solid color-mix(in srgb, var(--foreground-l4) 70%, transparent);
    border-radius: var(--radius-sm);
    pointer-events: none;

    :global(svg) {
      inline-size: 0.75rem;
      block-size: 0.75rem;
      opacity: 0;
    }
  }

  input:checked + check-box {
    background: var(--foreground-l1);
    border-color: var(--foreground-l1);

    :global(svg) {
      opacity: 1;
    }
  }

  input:focus-visible + check-box {
    outline: 2px solid var(--ring);
  }

  input:disabled {
    cursor: default;
  }

  input:disabled + check-box {
    opacity: 0.5;
  }
</style>
