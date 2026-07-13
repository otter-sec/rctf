<script lang="ts">
  import EdgeFades from '$lib/components/edge-fades.svelte'
  import type { Snippet } from 'svelte'

  interface Props {
    disabled: boolean
    children: Snippet
  }

  let { disabled, children }: Props = $props()
</script>

<form-viewport data-fade-scope>
  <form-scroll
    data-fade-source
    tabindex="-1"
    data-mode={disabled ? 'view' : 'edit'}
  >
    {@render children()}
  </form-scroll>
  <EdgeFades />
</form-viewport>

<style>
  form-viewport {
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
  }

  form-scroll {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--space-s);
    min-block-size: 0;
    padding: var(--space-s) 1.25rem var(--space-l);
    overflow-y: auto;
    overscroll-behavior: none;

    &[data-mode='view'] {
      opacity: 0.6;
    }
  }
</style>
