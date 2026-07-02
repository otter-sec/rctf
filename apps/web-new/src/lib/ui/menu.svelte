<script lang="ts">
  import * as menu from '@zag-js/menu'
  import { normalizeProps, useMachine } from '@zag-js/svelte'
  import Portal from '$lib/ui/portal.svelte'
  import type { Component, Snippet } from 'svelte'

  export type MenuItem = {
    value: string
    label: string
    icon?: Component
    href?: string
    onSelect?: () => void
  }

  type Props = {
    label: string
    items: MenuItem[]
    placement?: 'bottom-start' | 'bottom-end'
    trigger: Snippet<[{ props: Record<string, unknown> }]>
  }

  let { label, items, placement = 'bottom-start', trigger }: Props = $props()

  const id = $props.id()
  // Zag thunk rule: controlled props passed as a plain object silently freeze
  const service = useMachine(menu.machine, () => ({
    id,
    'aria-label': label,
    positioning: { placement },
    onSelect({ value }: { value: string }) {
      items.find(item => item.value === value)?.onSelect?.()
    },
  }))
  const api = $derived(menu.connect(service, normalizeProps))

  const triggerProps = $derived(api.getTriggerProps() as Record<string, unknown>)
</script>

{@render trigger({ props: triggerProps })}

<!-- unlike dialog, the menu stays mounted while closed ([hidden] drives
     visibility): focus lives on the content element via aria-activedescendant,
     so it must exist before the open transition -->
<Portal>
  <div {...api.getPositionerProps()}>
    <div {...api.getContentProps()}>
      {#each items as item (item.value)}
        {@const Icon = item.icon}
        {#if item.href}
          <a {...api.getItemProps({ value: item.value })} href={item.href}>
            {#if Icon}<Icon />{/if}
            {item.label}
          </a>
        {:else}
          <div {...api.getItemProps({ value: item.value })}>
            {#if Icon}<Icon />{/if}
            {item.label}
          </div>
        {/if}
      {/each}
    </div>
  </div>
</Portal>

<style>
  [data-part='content'] {
    /* popper copies the content z-index into the positioner's --z-index */
    z-index: var(--layer-popover);
    display: flex;
    flex-direction: column;
    min-inline-size: var(--menu-min-width, 12rem);
    padding: 0.25rem;
    background: var(--background-l1);
    border: 2px solid var(--border);
    border-radius: var(--radius-md);

    &:focus-visible {
      outline: none;
    }
  }

  [data-part='item'] {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    padding: 0.375rem 0.5rem;
    color: var(--foreground-l1);
    text-decoration: none;
    cursor: pointer;
    border-radius: var(--radius-sm);

    &[data-highlighted] {
      background: var(--background-l3);
    }

    :global(svg) {
      inline-size: 1em;
      block-size: 1em;
      flex-shrink: 0;
    }
  }
</style>
