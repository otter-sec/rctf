<script lang="ts">
  import { IconCaretDown } from '$lib/icons'
  import Menu from '$lib/ui/menu.svelte'

  type Option = { value: string; label: string }

  type Props = {
    value: string
    options: Option[]
    onValueChange: (value: string) => void
    label: string
    placeholder?: string
    disabled?: boolean
  }

  let {
    value,
    options,
    onValueChange,
    label,
    placeholder = 'Select...',
    disabled = false,
  }: Props = $props()

  const current = $derived(options.find(option => option.value === value))
  const items = $derived(
    options.map(option => ({
      value: option.value,
      label: option.label,
      checked: option.value === value,
      onSelect: () => onValueChange(option.value),
    }))
  )
</script>

<Menu {label} {items} sameWidth>
  {#snippet trigger({ props })}
    <button
      type="button"
      {disabled}
      data-placeholder={current ? undefined : ''}
      {...props}
    >
      <span>{current?.label ?? placeholder}</span>
      <IconCaretDown />
    </button>
  {/snippet}
</Menu>

<style>
  button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2xs);
    inline-size: 100%;
    block-size: 2.25rem;
    padding-inline: var(--space-2xs);
    color: var(--foreground-l0);
    text-align: start;
    cursor: pointer;
    background: var(--background-l4);
    border: 2px solid transparent;
    border-radius: var(--radius-md);

    &[data-placeholder] span {
      color: var(--foreground-l4);
    }

    &:hover:not(:disabled) {
      background: var(--background-l5);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: -1px;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    :global(svg) {
      flex-shrink: 0;
      inline-size: 1em;
      block-size: 1em;
      color: var(--foreground-l3);
    }
  }

  span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>
