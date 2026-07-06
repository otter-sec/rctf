<!--
  Master-detail layout for arrays of objects and object-valued records. The
  sidebar lists items, the footer holds the add control, and the content pane
  renders the selected item. Collapses to a stacked layout below 28rem via a
  container query.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    label: string
    sidebar: Snippet
    footer: Snippet
    content: Snippet
  }

  let { label, sidebar, footer, content }: Props = $props()
</script>

<panel-root>
  <panel-header>{label}</panel-header>
  <panel-body>
    <panel-side>
      <panel-list>{@render sidebar()}</panel-list>
      <panel-footer>{@render footer()}</panel-footer>
    </panel-side>
    <panel-content>{@render content()}</panel-content>
  </panel-body>
</panel-root>

<style>
  panel-root {
    display: block;
    overflow: clip;
    container: panel / inline-size;
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
  }

  panel-header {
    display: block;
    padding: 0.375rem 1rem;
    color: var(--foreground-l3);
    background: var(--background-l3);
  }

  panel-body {
    display: flex;
    flex-direction: column;
    min-block-size: 12rem;
  }

  panel-side {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    border-block-end: 2px solid var(--border);
  }

  panel-list {
    display: flex;
    flex-flow: row wrap;
    gap: var(--space-3xs);
    padding: var(--space-2xs);
  }

  panel-footer {
    padding: var(--space-2xs);
    border-block-start: 2px solid var(--border);
  }

  panel-content {
    flex: 1;
    min-inline-size: 0;
    padding: var(--space-s);
  }

  @container panel (min-width: 28rem) {
    panel-body {
      flex-direction: row;
    }

    panel-side {
      /* Keep the picker in view while a long entry form scrolls beneath it. */
      position: sticky;
      inset-block-start: 0;
      align-self: flex-start;
      inline-size: 11rem;
      border-block-end: none;
      border-inline-end: 2px solid var(--border);
    }

    panel-list {
      flex-direction: column;
      gap: 0.125rem;
    }
  }
</style>
