<script lang="ts">
  import { IconX } from '$lib/icons'
  import SubmissionsDesktopFilterChips from './submissions-desktop-filter-chips.svelte'
  import SubmissionsDesktopFilterMenu from './submissions-desktop-filter-menu.svelte'
  import type {
    RootFilterOptionMatch,
    TimeFilterFamily,
    ValueFilterFamily,
  } from './submissions-filter-ui'
  import { clearSubmissionFilters, type SubmissionFilters } from './submissions-filters'
  import SubmissionsMobileFilterDrawer from './submissions-mobile-filter-drawer.svelte'

  interface Props {
    filters: SubmissionFilters
    rootFilterSearch: string
    valueFamilies: readonly ValueFilterFamily[]
    timeFamily: TimeFilterFamily
    rootValueFamilyMatches: readonly ValueFilterFamily[]
    rootTimeFamilyMatches: boolean
    rootOptionMatches: readonly RootFilterOptionMatch[]
    rootFilterScrollKey: string
    isRootSearchActive: boolean
    hasRootSearchMatches: boolean
    isSearchingTeams: boolean
    hasFilters: boolean
    isMobile: boolean
    timeRangeSummary: string
    timeRangeError?: string
  }

  let {
    filters = $bindable<SubmissionFilters>(),
    rootFilterSearch = $bindable(''),
    valueFamilies,
    timeFamily,
    rootValueFamilyMatches,
    rootTimeFamilyMatches,
    rootOptionMatches,
    rootFilterScrollKey,
    isRootSearchActive,
    hasRootSearchMatches,
    isSearchingTeams,
    hasFilters,
    isMobile,
    timeRangeSummary,
    timeRangeError,
  }: Props = $props()
</script>

<div class="relative z-20 flex min-w-0 items-center gap-1.5 overflow-visible border-b-2 px-3 py-2">
  {#if isMobile}
    <SubmissionsMobileFilterDrawer
      bind:filters
      {valueFamilies}
      {hasFilters}
      {timeRangeSummary}
      {timeRangeError}
    />
  {:else}
    <SubmissionsDesktopFilterMenu
      bind:filters
      bind:rootFilterSearch
      {valueFamilies}
      {timeFamily}
      {rootValueFamilyMatches}
      {rootTimeFamilyMatches}
      {rootOptionMatches}
      {rootFilterScrollKey}
      {isRootSearchActive}
      {hasRootSearchMatches}
      {isSearchingTeams}
      {hasFilters}
      {timeRangeError}
    />
  {/if}

  <SubmissionsDesktopFilterChips bind:filters {valueFamilies} {timeRangeSummary} {timeRangeError} />

  {#if hasFilters}
    <button
      type="button"
      class="text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l3 flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-sm transition-colors"
      onclick={() => clearSubmissionFilters(filters)}
    >
      <IconX class="size-3.5" />
      Clear
    </button>
  {/if}
  {#if timeRangeError}
    <span class="text-foreground-destructive shrink-0 px-1 text-sm">{timeRangeError}</span>
  {/if}
</div>
