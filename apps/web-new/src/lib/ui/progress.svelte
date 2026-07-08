<script lang="ts">
  import * as progress from '@zag-js/progress'
  import { normalizeProps, useMachine } from '@zag-js/svelte'

  type Props = {
    value: number
    max: number
    label?: string
  }

  let { value, max, label }: Props = $props()

  const id = $props.id()
  const service = useMachine(progress.machine, () => ({ id, value, max }))
  const api = $derived(progress.connect(service, normalizeProps))
</script>

<div {...api.getRootProps()}>
  {#if label}
    <span {...api.getLabelProps()}>{label}</span>
  {/if}
  <div {...api.getTrackProps()}>
    <div {...api.getRangeProps()}></div>
  </div>
</div>

<style>
  [data-part='root'] {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
  }

  [data-part='label'] {
    font-size: var(--step--1);
    color: var(--foreground-l2);
  }

  [data-part='track'] {
    overflow: hidden;
    block-size: var(--progress-height, var(--space-2xs));
    background: var(--background-l2);
    border-radius: var(--radius-full);
  }

  [data-part='range'] {
    block-size: 100%;
    background: var(--background-accent);
    border-radius: var(--radius-full);
  }
</style>
