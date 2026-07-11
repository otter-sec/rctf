<script lang="ts">
  import {
    buildRegionItems,
    fromComboboxValue,
    NO_COUNTRY_VALUE,
    toComboboxValue,
    type RegionItem,
  } from '$lib/components/flag-picker-items'
  import { IconCheck } from '$lib/icons'
  import Combobox from '$lib/ui/combobox.svelte'
  import { countryCodeToFlagFilename } from '$lib/utils/flags'

  type Props = {
    value?: string | null
    placeholder?: string
    id?: string
    describedBy?: string
    disabled?: boolean
  }

  let {
    value = $bindable(null),
    placeholder = 'Select country...',
    id,
    describedBy,
    disabled = false,
  }: Props = $props()

  const items = buildRegionItems('No country')

  const comboValue = $derived(toComboboxValue(value))

  function handleChange(next: string | null) {
    value = fromComboboxValue(next)
  }
</script>

{#snippet selectedFlag()}
  <img src="/flags/{countryCodeToFlagFilename(value!)}" alt="" />
{/snippet}

<Combobox
  {items}
  value={comboValue}
  onValueChange={handleChange}
  {placeholder}
  {id}
  {describedBy}
  {disabled}
  emptyText="No country found"
  prefix={value ? selectedFlag : undefined}
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
