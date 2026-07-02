<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    title: string
    children: Snippet
  }

  let { title, children }: Props = $props()
</script>

<ui-section>
  <section-header>{title}</section-header>
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
    display: block;
    padding: var(--space-3xs) var(--space-s);
    color: var(--foreground-l3);
    background: var(--background-l3);
  }

  section-content {
    display: block;
    padding: var(--space-s);
  }
</style>
