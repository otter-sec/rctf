<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    children: Snippet
  }

  let { children }: Props = $props()
</script>

<ui-chip>{@render children()}</ui-chip>

<style>
  ui-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-3xs);
    padding: 0.125rem var(--space-2xs);
    font-size: var(--step--1);
    color: var(--foreground-l1);
    white-space: nowrap;
    background: var(--background-l4);
    border-radius: var(--radius-full);
  }
</style>
