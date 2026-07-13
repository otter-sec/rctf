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
    flex-shrink: 0;
    align-items: center;
    gap: var(--space-3xs);
    padding: 0.125rem 0.375rem;
    font-size: 0.75rem;
    color: inherit;
    white-space: nowrap;
    background: var(--background-l2);
    border-radius: var(--radius-sm);

    @media (width >= 40rem) {
      font-size: 0.875rem;
    }
  }
</style>
