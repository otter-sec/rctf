<script lang="ts">
  import { normalizeProps, useMachine } from '@zag-js/svelte'
  import * as tabs from '@zag-js/tabs'
  import type { Component, Snippet } from 'svelte'

  type Tab = {
    value: string
    label: string
    count?: number
    icon?: Component
    invalid?: boolean
  }

  type Props = {
    value?: string | null
    onValueChange?: (value: string) => void
    tabs: Tab[]
    content: Snippet<[{ value: string }]>
  }

  let {
    value = $bindable(null),
    onValueChange,
    tabs: items,
    content,
  }: Props = $props()

  const id = $props.id()
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
      <button
        {...api.getTriggerProps({ value: tab.value })}
        data-invalid={tab.invalid ? '' : undefined}
      >
        {#if tab.icon}
          <tab.icon data-slot="tab-icon" />
        {/if}
        {tab.label}{#if tab.count !== undefined}<tab-count
            >({tab.count})</tab-count
          >{/if}{#if tab.invalid}<tab-invalid aria-hidden="true"
          ></tab-invalid>{/if}
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
  }

  [data-part='trigger'] {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 1rem;
    color: var(--foreground-l2);
    white-space: nowrap;
    cursor: pointer;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;

    &[data-selected] {
      color: var(--foreground-l0);
      background: var(--background-l2);
    }

    :global([data-slot='tab-icon']) {
      flex-shrink: 0;
      font-size: 1rem;
    }
  }

  tab-invalid {
    display: inline-block;
    inline-size: 0.375rem;
    block-size: 0.375rem;
    border-radius: var(--radius-full);
    background: var(--foreground-destructive);
  }

  [data-part='content'] {
    &:focus-visible {
      outline: none;
    }
  }
</style>
