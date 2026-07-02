<!--
  Two-panel resizable splitter. Sizes are percentages (defaultSize must total
  100). Panel bodies come from the `a`/`b` snippets; a draggable handle with a
  grip sits between them. Tune the hit area with `--splitter-handle-size`.

  <Splitter
    panels={[{ id: 'list', minSize: 20 }, { id: 'detail', minSize: 30 }]}
    defaultSize={[40, 60]}
  >
    {#snippet a()}…{/snippet}
    {#snippet b()}…{/snippet}
  </Splitter>
-->
<script lang="ts">
  import * as splitter from '@zag-js/splitter'
  import { normalizeProps, useMachine } from '@zag-js/svelte'
  import type { Snippet } from 'svelte'

  type Panel = { id: string; minSize?: number; maxSize?: number }

  type Props = {
    panels: [Panel, Panel]
    defaultSize: [number, number]
    a: Snippet
    b: Snippet
  }

  let { panels, defaultSize, a, b }: Props = $props()

  const id = $props.id()
  // Zag thunk rule: controlled props passed as a plain object silently freeze
  const service = useMachine(splitter.machine, () => ({
    id,
    defaultSize,
    panels,
  }))
  const api = $derived(splitter.connect(service, normalizeProps))

  const resizeTriggerId = $derived(`${panels[0].id}:${panels[1].id}` as `${string}:${string}`)
</script>

<div {...api.getRootProps()}>
  <div {...api.getPanelProps({ id: panels[0].id })}>
    {@render a()}
  </div>
  <div {...api.getResizeTriggerProps({ id: resizeTriggerId })}>
    <span {...api.getResizeTriggerIndicator({ id: resizeTriggerId })}></span>
  </div>
  <div {...api.getPanelProps({ id: panels[1].id })}>
    {@render b()}
  </div>
</div>

<style>
  [data-part='root'] {
    block-size: 100%;
  }

  [data-part='panel'] {
    overflow: hidden;
  }

  [data-part='resize-trigger'] {
    display: flex;
    align-items: center;
    justify-content: center;
    inline-size: var(--splitter-handle-size, var(--space-2xs));

    &[data-dragging] [data-part='resize-trigger-indicator'],
    &:hover [data-part='resize-trigger-indicator'] {
      background: var(--foreground-l3);
    }
  }

  [data-part='resize-trigger-indicator'] {
    inline-size: 2px;
    block-size: var(--space-l);
    background: var(--border);
    border-radius: var(--radius-full);
  }
</style>
