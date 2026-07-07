<script lang="ts" module>
  export type ComboboxItem = {
    value: string
    label: string
    disabled?: boolean
  }
</script>

<script lang="ts" generics="T extends ComboboxItem">
  import * as combobox from '@zag-js/combobox'
  import { normalizeProps, useMachine } from '@zag-js/svelte'
  import IconChevronDown from '$lib/icons/icon-chevron-down.svelte'
  import Portal from '$lib/ui/portal.svelte'
  import type { Snippet } from 'svelte'

  type Props = {
    items: T[]
    value?: string | null
    onValueChange?: (value: string | null) => void
    placeholder?: string
    label?: string
    id?: string
    describedBy?: string
    emptyText?: string
    disabled?: boolean
    item: Snippet<[{ item: T; selected: boolean }]>
  }

  let {
    items,
    value = $bindable(null),
    onValueChange,
    placeholder,
    label,
    id: fieldId,
    describedBy,
    emptyText = 'No results',
    disabled = false,
    item,
  }: Props = $props()

  let filterText = $state('')
  const filtered = $derived(
    filterText
      ? items.filter(entry => entry.label.toLowerCase().includes(filterText.toLowerCase()))
      : items
  )
  const collection = $derived(
    combobox.collection({
      items: filtered,
      itemToValue: entry => entry.value,
      itemToString: entry => entry.label,
      isItemDisabled: entry => entry.disabled ?? false,
    })
  )

  const machineId = $props.id()
  const service = useMachine(combobox.machine, () => ({
    id: machineId,
    ids: fieldId ? { input: fieldId } : undefined,
    collection,
    value: value ? [value] : [],
    placeholder,
    disabled,
    openOnClick: true,
    positioning: { placement: 'bottom-start' as const, sameWidth: true },
    onOpenChange(details: { open: boolean }) {
      if (details.open) filterText = ''
    },
    onInputValueChange(details: combobox.InputValueChangeDetails) {
      if (details.reason === 'input-change') filterText = details.inputValue
    },
    onValueChange(details: combobox.ValueChangeDetails<T>) {
      const next = details.value[0] ?? null
      value = next
      onValueChange?.(next)
    },
  }))
  const api = $derived(combobox.connect(service, normalizeProps))

  const inputProps = $derived({
    ...api.getInputProps(),
    'aria-label': label,
    'aria-describedby': describedBy,
  } as Record<string, unknown>)
</script>

<div {...api.getRootProps()}>
  <div {...api.getControlProps()}>
    <input {...inputProps} />
    <button {...api.getTriggerProps()} type="button" aria-label="Toggle options">
      <IconChevronDown />
    </button>
  </div>
</div>

<Portal>
  <div {...api.getPositionerProps()}>
    <div {...api.getContentProps()}>
      {#each filtered as entry (entry.value)}
        {@const state = api.getItemState({ item: entry })}
        <div {...api.getItemProps({ item: entry })}>
          {@render item({ item: entry, selected: state.selected })}
        </div>
      {:else}
        <combobox-empty>{emptyText}</combobox-empty>
      {/each}
    </div>
  </div>
</Portal>

<style>
  [data-part='control'] {
    position: relative;
    display: flex;
    align-items: center;
    inline-size: 100%;
  }

  [data-part='input'] {
    inline-size: 100%;
    block-size: 2.25rem;
    padding-inline: var(--space-2xs) 2.25rem;
    color: var(--foreground-l0);
    background: var(--background-l4);
    border: 2px solid transparent;
    border-radius: var(--radius-md);

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: -1px;
    }
  }

  [data-part='trigger'] {
    position: absolute;
    inset-inline-end: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    inline-size: 2.25rem;
    block-size: 2.25rem;
    color: var(--foreground-l3);
    cursor: pointer;

    :global(svg) {
      inline-size: 1em;
      block-size: 1em;
    }
  }

  [data-part='content'] {
    z-index: var(--layer-popover);
    display: flex;
    flex-direction: column;
    max-block-size: 18rem;
    overflow-y: auto;
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
    cursor: pointer;
    border-radius: var(--radius-sm);

    &[data-highlighted] {
      background: var(--background-l3);
    }

    &[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  combobox-empty {
    display: block;
    padding: 0.5rem;
    color: var(--foreground-l3);
    font-size: var(--step--1);
    text-align: center;
  }
</style>
