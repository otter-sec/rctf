<script lang="ts">
  import IconChevronDown from '$lib/icons/icon-chevron-down.svelte'
  import Menu, { type MenuItem } from '$lib/ui/menu.svelte'

  type Props = {
    items: MenuItem[]
    selectedLabel: string
    describedBy?: string | undefined
    disabled?: boolean
  }

  let { items, selectedLabel, describedBy, disabled = false }: Props = $props()
</script>

<Menu label="Select division" {items} placement="bottom-start">
  {#snippet trigger({ props })}
    <button {...props} type="button" aria-describedby={describedBy} {disabled}>
      <span>{selectedLabel}</span>
      <IconChevronDown aria-hidden="true" />
    </button>
  {/snippet}
</Menu>

<style>
  button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3xs);
    inline-size: 100%;
    block-size: 2.25rem;
    padding-inline: var(--space-2xs);
    color: var(--foreground-l0);
    background: var(--background-l4);
    border: 2px solid transparent;
    border-radius: var(--radius-md);
    cursor: pointer;

    span {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    :global(svg) {
      flex-shrink: 0;
      opacity: 0.5;
    }

    &:hover {
      background: var(--background-l5);
    }

    &[data-state='open'] {
      border-color: var(--border);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: -1px;
    }

    &:disabled {
      pointer-events: none;
      opacity: 0.5;
    }
  }
</style>
