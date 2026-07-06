<script lang="ts">
  import {
    buildRegionItems,
    fromComboboxValue,
    NO_COUNTRY_VALUE,
    toComboboxValue,
    type RegionItem,
  } from '$lib/components/flag-picker-items'
  import IconCheck from '$lib/icons/icon-check.svelte'
  import Combobox from '$lib/ui/combobox.svelte'
  import { countryCodeToFlagFilename } from '$lib/utils/flags'

  type Props = {
    value?: string | null
    onValueChange?: (value: string | null) => void
    placeholder?: string
    label?: string
    id?: string
    describedBy?: string
    disabled?: boolean
  }

  let {
    value = $bindable(null),
    onValueChange,
    placeholder = 'Select country...',
    label,
    id,
    describedBy,
    disabled = false,
  }: Props = $props()

  const items = buildRegionItems('No country')

  const comboValue = $derived(toComboboxValue(value))

  function handleChange(next: string | null) {
    value = fromComboboxValue(next)
    onValueChange?.(value)
  }
</script>

<Combobox
  {items}
  value={comboValue}
  onValueChange={handleChange}
  {placeholder}
  {label}
  {id}
  {describedBy}
  {disabled}
  emptyText="No country found"
>
  {#snippet item({ item, selected }: { item: RegionItem; selected: boolean })}
    <flag-check data-selected={selected ? '' : undefined}>
      <IconCheck />
    </flag-check>
    {#if item.value !== NO_COUNTRY_VALUE}
      <img src="/flags/{countryCodeToFlagFilename(item.value)}" alt="" />
    {/if}
    <span>{item.label}</span>
  {/snippet}
</Combobox>

<style>
  flag-check {
    display: flex;
    flex-shrink: 0;
    color: var(--foreground-accent);

    &:not([data-selected]) {
      visibility: hidden;
    }

    :global(svg) {
      inline-size: 1em;
      block-size: 1em;
    }
  }

  img {
    flex-shrink: 0;
    block-size: 1.25rem;
    inline-size: auto;
  }

  span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>
