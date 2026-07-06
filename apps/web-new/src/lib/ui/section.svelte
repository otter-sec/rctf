<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    title: string
    actions?: Snippet
    children: Snippet
  }

  let { title, actions, children }: Props = $props()
</script>

<ui-section>
  <section-header>
    {title}
    {#if actions}{@render actions()}{/if}
  </section-header>
  <section-content>{@render children()}</section-content>
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
  }
</style>
