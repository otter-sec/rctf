<script lang="ts">
  import { normalizeProps, useMachine } from '@zag-js/svelte'
  import * as tooltip from '@zag-js/tooltip'
  import Portal from '$lib/ui/portal.svelte'
  import type { Snippet } from 'svelte'

  type Props = {
    label: string
    children: Snippet<[{ props: Record<string, unknown> }]>
  }

  let { label, children }: Props = $props()

  const id = $props.id()
  const service = useMachine(tooltip.machine, { id, openDelay: 300 })
  const api = $derived(tooltip.connect(service, normalizeProps))

  const triggerProps = $derived(api.getTriggerProps() as Record<string, unknown>)
</script>

{@render children({ props: triggerProps })}

{#if api.open}
  <Portal>
    <div {...api.getPositionerProps()}>
      <div {...api.getContentProps()}>{label}</div>
    </div>
  </Portal>
{/if}

<style>
  [data-part='content'] {
    z-index: var(--layer-popover);
    padding: var(--space-3xs) var(--space-2xs);
    font-size: var(--step--1);
    color: var(--foreground-l1);
    background: var(--background-l2);
    border: 2px solid var(--border);
    border-radius: var(--radius-sm);
  }
</style>
