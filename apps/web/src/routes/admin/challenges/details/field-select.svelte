<script lang="ts">
  import { IconCaretDown } from '$lib/icons'
  import Menu, { type MenuItem } from '$lib/ui/menu.svelte'

  interface Props {
    label: string
    items: MenuItem[]
    disabled?: boolean
  }

  let { label, items, disabled = false }: Props = $props()
</script>

{#if disabled}
  <button type="button" data-field-trigger data-disabled disabled>
    {label}<IconCaretDown />
  </button>
{:else}
  <Menu {label} {items} sameWidth>
    {#snippet trigger({ props })}
      <button type="button" data-field-trigger {...props}>
        {label}<IconCaretDown />
      </button>
    {/snippet}
  </Menu>
{/if}

<style>
  [data-field-trigger] {
    display: flex;
    align-items: center;
    justify-content: space-between;
    inline-size: 100%;
    block-size: 2.25rem;
    padding-inline: var(--space-2xs);
    color: var(--foreground-l0);
    text-align: start;
    cursor: pointer;
    background: var(--background-l4);
    border: 2px solid transparent;
    border-radius: var(--radius-md);

    &:hover:not([data-disabled]) {
      background: var(--background-l5);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: -1px;
    }

    &[data-disabled] {
      cursor: default;
      opacity: 0.5;
    }

    :global(svg) {
      flex-shrink: 0;
      color: var(--foreground-l3);
    }
  }
</style>
