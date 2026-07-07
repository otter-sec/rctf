<script lang="ts">
  import * as menu from '@zag-js/menu'
  import { normalizeProps, useMachine } from '@zag-js/svelte'
  import IconCheck from '$lib/icons/icon-check.svelte'
  import Portal from '$lib/ui/portal.svelte'
  import type { Component, Snippet } from 'svelte'

  export type MenuItem = {
    value: string
    label: string
    icon?: Component
    href?: string
    onSelect?: () => void
    checked?: boolean
  }

  type Props = {
    label: string
    items: MenuItem[]
    placement?: 'bottom-start' | 'bottom-end'
    sameWidth?: boolean
    trigger: Snippet<[{ props: Record<string, unknown> }]>
  }

  let { label, items, placement = 'bottom-start', sameWidth = false, trigger }: Props = $props()

  const id = $props.id()
  const service = useMachine(menu.machine, () => ({
    id,
    'aria-label': label,
    positioning: { placement, sameWidth },
    onSelect({ value }: { value: string }) {
      items.find(item => item.value === value)?.onSelect?.()
    },
  }))
  const api = $derived(menu.connect(service, normalizeProps))

  const triggerProps = $derived(api.getTriggerProps() as Record<string, unknown>)
</script>

{@render trigger({ props: triggerProps })}

<Portal>
  <div {...api.getPositionerProps()}>
    <div {...api.getContentProps()} data-same-width={sameWidth || undefined}>
      {#each items as item (item.value)}
        {@const Icon = item.icon}
        {#if item.href}
          <a {...api.getItemProps({ value: item.value })} href={item.href}>
            {#if Icon}<Icon />{/if}
            {item.label}
          </a>
        {:else if item.checked !== undefined}
          <div
            {...api.getOptionItemProps({
              type: 'radio',
              value: item.value,
              checked: item.checked,
            })}
          >
            {#if Icon}<Icon />{/if}
            <span>{item.label}</span>
            <option-check aria-hidden="true"><IconCheck /></option-check>
          </div>
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
    z-index: var(--layer-popover);
    display: flex;
    flex-direction: column;
    min-inline-size: var(--menu-min-width, 12rem);
    padding: 0.25rem;
    background: var(--background-l1);
    border: 2px solid var(--border);
    border-radius: var(--radius-md);

    &[data-same-width] {
      min-inline-size: 0;
    }

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

    &[role='menuitemradio'] span {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }

  option-check {
    display: flex;
    margin-inline-start: auto;
    padding-inline-start: var(--space-2xs);
    color: var(--foreground-accent);

    [data-part='item'][data-state='unchecked'] & {
      visibility: hidden;
    }
  }
</style>
