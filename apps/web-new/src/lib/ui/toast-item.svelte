<script lang="ts">
  import { normalizeProps, useMachine } from '@zag-js/svelte'
  import * as toast from '@zag-js/toast'

  type Props = {
    actor: toast.Props
    parent: toast.GroupService
    index: number
  }

  let { actor, parent, index }: Props = $props()

  const service = useMachine(toast.machine, () => ({
    ...actor,
    parent,
    index,
    translations: { closeTriggerLabel: 'Dismiss notification' },
  }))
  const api = $derived(toast.connect(service, normalizeProps))
</script>

<div {...api.getRootProps()}>
  <div {...api.getGhostBeforeProps()}></div>
  <span {...api.getTitleProps()}>{api.title}</span>
  {#if api.description}
    <span {...api.getDescriptionProps()}>{api.description}</span>
  {/if}
  <button {...api.getCloseTriggerProps()}>&times;</button>
  <div {...api.getGhostAfterProps()}></div>
</div>

<style>
  [data-part='root'] {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2xs);
    inline-size: 20rem;
    height: var(--height);
    padding: var(--space-2xs) var(--space-xs);
    background: var(--background-l1);
    border: 2px solid var(--border);
    border-radius: var(--radius-md);
    translate: var(--x) var(--y);
    scale: var(--scale);
    opacity: var(--opacity);
    z-index: var(--z-index);
    will-change: translate, opacity, scale;
    transition:
      translate 200ms ease,
      scale 200ms ease,
      opacity 200ms ease;

    &[data-type='error'] {
      color: var(--foreground-destructive);
    }

    &[data-type='success'] {
      color: var(--foreground-success);
    }
  }

  [data-part='title'] {
    flex: 1;
    font-size: var(--step--1);
  }

  [data-part='description'] {
    flex-basis: 100%;
    font-size: var(--step--1);
    color: var(--foreground-l3);
  }

  [data-part='close-trigger'] {
    cursor: pointer;
  }
</style>
