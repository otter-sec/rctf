<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    title: string
    flush?: boolean
    children: Snippet
  }

  let { title, flush = false, children }: Props = $props()
</script>

<ui-section>
  <section-header>{title}</section-header>
  <section-content data-flush={flush || undefined}
    >{@render children()}</section-content
  >
</ui-section>

<style>
  ui-section {
    display: block;
    overflow: clip;
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
  }

  section-header {
    display: flex;
    gap: var(--space-2xs);
    align-items: center;
    justify-content: space-between;
    padding: 0.375rem 1rem;
    color: var(--foreground-l3);
    background: var(--background-l3);
  }

  section-content {
    display: block;
    padding: 0.5rem 1rem;

    &[data-flush] {
      padding: 0;
    }
  }
</style>
