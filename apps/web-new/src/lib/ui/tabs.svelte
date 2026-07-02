<!--
  Tab strip with a body per tab. All panels stay mounted; Zag toggles them via
  the `hidden` attribute (no {#if}), so tab state survives switching.

  <Tabs bind:value tabs={[{ value: 'a', label: 'A', count: 3 }, …]}>
    {#snippet content({ value })}
      …body for {value}…
    {/snippet}
  </Tabs>
-->
<script lang="ts">
  import { normalizeProps, useMachine } from '@zag-js/svelte'
  import * as tabs from '@zag-js/tabs'
  import type { Snippet } from 'svelte'

  type Tab = { value: string; label: string; count?: number }

  type Props = {
    value?: string | null
    onValueChange?: (value: string) => void
    tabs: Tab[]
    content: Snippet<[{ value: string }]>
  }

  let { value = $bindable(null), onValueChange, tabs: items, content }: Props = $props()

  const id = $props.id()
  // Zag thunk rule: controlled props passed as a plain object silently freeze
  const service = useMachine(tabs.machine, () => ({
    id,
    value,
    onValueChange(details: { value: string }) {
      value = details.value
      onValueChange?.(details.value)
    },
  }))
  const api = $derived(tabs.connect(service, normalizeProps))
</script>

<div {...api.getRootProps()}>
  <div {...api.getListProps()}>
    {#each items as tab (tab.value)}
      <button {...api.getTriggerProps({ value: tab.value })}>
        {tab.label}
        {#if tab.count !== undefined}
          <tab-count>{tab.count}</tab-count>
        {/if}
      </button>
    {/each}
  </div>
  {#each items as tab (tab.value)}
    <div {...api.getContentProps({ value: tab.value })}>
      {@render content({ value: tab.value })}
    </div>
  {/each}
</div>

<style>
  [data-part='list'] {
    display: flex;
    gap: var(--space-s);
    border-block-end: 1px solid var(--border);
  }

  [data-part='trigger'] {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2xs);
    padding-block: var(--space-2xs);
    color: var(--foreground-l2);
    cursor: pointer;

    &[data-selected] {
      color: var(--foreground-l0);
      box-shadow: inset 0 -2px 0 0 var(--foreground-accent);
    }
  }

  tab-count {
    font-size: var(--step--1);
    color: var(--foreground-l3);
  }

  [data-part='content'] {
    padding-block-start: var(--space-s);

    &:focus-visible {
      outline: none;
    }
  }
</style>
