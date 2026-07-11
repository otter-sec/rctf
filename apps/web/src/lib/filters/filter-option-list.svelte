<script lang="ts">
  import Spinner from '$lib/ui/spinner.svelte'
  import FilterOption from './filter-option.svelte'
  import FilterSearchInput from './filter-search-input.svelte'
  import type { ValueFilterFamily } from './ui'

  type Props = {
    family: ValueFilterFamily
    searchable?: boolean
    mobile?: boolean
  }

  let { family, searchable = false, mobile = false }: Props = $props()

  const options = $derived(family.options())
  const loading = $derived(family.loading?.() ?? false)
</script>

{#if searchable && family.search}
  {@const search = family.search}
  <FilterSearchInput
    value={search.value()}
    placeholder={search.placeholder}
    onInput={search.onInput}
    variant={mobile ? 'mobile' : 'menu'}
  />
{/if}

<option-list data-mobile={mobile || undefined} data-scroll={searchable || undefined}>
  {#if loading}
    <option-status><Spinner />{family.loadingLabel}</option-status>
  {:else if options.length === 0}
    <option-status data-empty>{family.emptyLabel}</option-status>
  {:else}
    {#each options as option (family.optionKey(option))}
      <FilterOption {family} {option} {mobile} />
    {/each}
  {/if}
</option-list>

<style>
  option-list {
    display: flex;
    flex-direction: column;
    padding: var(--space-3xs);

    &[data-mobile] {
      gap: var(--space-3xs);
      padding: var(--space-2xs);

      option-status {
        padding-block: 2rem;
        justify-content: center;
      }
    }

    &[data-scroll] {
      min-block-size: 0;
      flex: 1;
      overflow-y: auto;
      overscroll-behavior: none;
    }
  }

  option-status {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    padding: 0.375rem 0.5rem;
    color: var(--foreground-l3);
    font-size: var(--step--1);

    &[data-empty] {
      justify-content: center;
    }
  }
</style>
