<script lang="ts">
  import IconChevronRight from '$lib/icons/icon-chevron-right.svelte'
  import IconClockFilled from '$lib/icons/icon-clock-filled.svelte'
  import IconFilter from '$lib/icons/icon-filter.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import Tooltip from '$lib/ui/tooltip.svelte'
  import type { Snippet } from 'svelte'
  import FilterOptionList from './filter-option-list.svelte'
  import FilterOption from './filter-option.svelte'
  import FilterPopover from './filter-popover.svelte'
  import FilterSearchInput from './filter-search-input.svelte'
  import {
    normalizeSearchText,
    rootFilterFamilyMatchesSearch,
    rootFilterOptionKey,
    rootSearchMatchesForFamily,
    type TimeFilterFamily,
    type ValueFilterFamily,
  } from './ui'

  // The funnel opens a drill-down panel rather than fly-out submenus (no popover
  // machine is available, and a flat menu cannot host the searchable lists): an
  // empty query lists families to drill into; a query surfaces matching families
  // plus cross-family option matches with a breadcrumb path.
  type Props = {
    families: ValueFilterFamily[]
    hasFilters: boolean
    timeFamily?: TimeFilterFamily
    timeMenu?: Snippet<[{ close: () => void }]>
    isSearchingTeams?: boolean
  }

  let { families, hasFilters, timeFamily, timeMenu, isSearchingTeams = false }: Props = $props()

  type Drill = ValueFilterFamily | 'time' | null

  let query = $state('')
  let active = $state<Drill>(null)

  const normalized = $derived(normalizeSearchText(query))
  const searching = $derived(normalized.length > 0)

  const familyMatches = $derived(
    searching ? families.filter(family => rootFilterFamilyMatchesSearch(family, normalized)) : []
  )
  const timeMatches = $derived(
    searching && !!timeFamily && rootFilterFamilyMatchesSearch(timeFamily, normalized)
  )
  const optionMatches = $derived(
    searching ? families.flatMap(family => rootSearchMatchesForFamily(family, normalized)) : []
  )
  const hasMatches = $derived(familyMatches.length > 0 || timeMatches || optionMatches.length > 0)

  const activeLabel = $derived(
    active === 'time' ? (timeFamily?.label ?? 'Time') : (active?.label ?? '')
  )

  function reset() {
    query = ''
    active = null
  }
</script>

{#snippet familyRow(family: ValueFilterFamily)}
  {@const Icon = family.icon}
  <family-row>
    <button type="button" onclick={() => (active = family)}>
      <Icon aria-hidden="true" />
      <span>{family.label}</span>
      <IconChevronRight aria-hidden="true" data-chevron />
    </button>
  </family-row>
{/snippet}

{#snippet drillHeader()}
  <drill-header>
    <button type="button" onclick={() => (active = null)}>
      <IconChevronRight aria-hidden="true" data-back />
      {activeLabel}
    </button>
  </drill-header>
{/snippet}

{#snippet timeRow()}
  {#if timeFamily}
    <family-row>
      <button type="button" onclick={() => (active = 'time')}>
        <IconClockFilled aria-hidden="true" />
        <span>{timeFamily.label}</span>
        <IconChevronRight aria-hidden="true" data-chevron />
      </button>
    </family-row>
  {/if}
{/snippet}

<Tooltip label="Add filter">
  {#snippet children({ props: tip })}
    <FilterPopover label="Add filter" width="20rem">
      {#snippet trigger({ props })}
        <button
          {...tip}
          {...props}
          type="button"
          aria-label="Add filter"
          data-active={hasFilters || undefined}
        >
          <IconFilter aria-hidden="true" />
        </button>
      {/snippet}

      {#snippet panel({ close })}
        <funnel-panel {@attach () => reset()}>
          {#if active === 'time'}
            {@render drillHeader()}
            {@render timeMenu?.({ close })}
          {:else if active}
            {@render drillHeader()}
            <FilterOptionList family={active} searchable={!!active.search} />
          {:else}
            <FilterSearchInput
              value={query}
              placeholder="Search filters..."
              onInput={value => (query = value)}
            />
            <funnel-body>
              {#if searching}
                {#each familyMatches as family (family.id)}
                  {@render familyRow(family)}
                {/each}
                {#if timeMatches}
                  {@render timeRow()}
                {/if}
                {#each optionMatches as match (rootFilterOptionKey(match))}
                  <FilterOption family={match.family} option={match.option} showPath />
                {/each}
                {#if isSearchingTeams}
                  <funnel-status><Spinner />Searching teams...</funnel-status>
                {/if}
                {#if !hasMatches && !isSearchingTeams}
                  <funnel-status data-empty>No filters found</funnel-status>
                {/if}
              {:else}
                {#each families as family (family.id)}
                  {@render familyRow(family)}
                {/each}
                {@render timeRow()}
              {/if}
            </funnel-body>
          {/if}
        </funnel-panel>
      {/snippet}
    </FilterPopover>
  {/snippet}
</Tooltip>

<style>
  button[aria-label='Add filter'] {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    inline-size: 2rem;
    block-size: 2rem;
    color: var(--foreground-l2);
    background: var(--background-l4);
    border: 2px solid var(--border);
    border-radius: var(--radius-md);
    cursor: pointer;

    :global(svg) {
      inline-size: 1em;
      block-size: 1em;
    }

    &:hover {
      color: var(--foreground-l1);
      background: var(--background-l5);
    }

    &[data-active] {
      color: var(--foreground-accent);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
    }
  }

  funnel-panel {
    display: flex;
    flex-direction: column;
    min-block-size: 0;
    max-block-size: min(29rem, 70vh);
  }

  funnel-body {
    display: flex;
    flex-direction: column;
    min-block-size: 0;
    overflow-y: auto;
    padding: var(--space-3xs);
  }

  drill-header {
    display: flex;
    flex-shrink: 0;
    border-block-end: 2px solid var(--border);

    button {
      display: flex;
      inline-size: 100%;
      align-items: center;
      gap: var(--space-2xs);
      block-size: 2.75rem;
      padding-inline: 0.5rem;
      color: var(--foreground-l2);
      background: transparent;
      border: none;
      font-size: var(--step--1);
      cursor: pointer;

      &:hover,
      &:focus-visible {
        background: var(--background-l3);
        outline: none;
      }

      :global(svg[data-back]) {
        inline-size: 1em;
        block-size: 1em;
        rotate: 180deg;
        color: var(--foreground-l4);
      }
    }
  }

  family-row button {
    display: flex;
    inline-size: 100%;
    align-items: center;
    gap: var(--space-2xs);
    padding: 0.375rem 0.5rem;
    color: var(--foreground-l2);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    font-size: var(--step--1);
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background: var(--background-l3);
      outline: none;
    }

    span {
      flex: 1;
      text-align: start;
    }

    :global(svg) {
      inline-size: 1em;
      block-size: 1em;
    }

    :global(svg[data-chevron]) {
      color: var(--foreground-l4);
    }
  }

  funnel-status {
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
