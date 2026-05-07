<script lang="ts">
  import { Spinner } from '$lib/components'
  import { IconSearch, IconX } from '$lib/icons'
  import TeamsDesktopFilterControls from './teams-desktop-filter-controls.svelte'
  import TeamsMobileFilterDrawer from './teams-mobile-filter-drawer.svelte'
  import {
    clearTeamFilters,
    hasTeamFilters,
    type DivisionFilterOption,
    type TeamFilters,
  } from './teams-model'

  interface Props {
    filters: TeamFilters
    divisionOptions: DivisionFilterOption[]
    isFetching: boolean
    isMobile: boolean
    pinnedToolbarWidth: string
  }

  let {
    filters = $bindable<TeamFilters>(),
    divisionOptions,
    isFetching,
    isMobile,
    pinnedToolbarWidth,
  }: Props = $props()

  const hasFilters = $derived(hasTeamFilters(filters))

  function updateSearch(value: string) {
    filters.search = value
  }
</script>

{#snippet searchInput()}
  <div
    class="bg-background-l2 text-foreground-l3 flex h-8 min-w-52 shrink-0 items-center gap-2 rounded-md border-2 px-2 md:w-72"
  >
    <IconSearch class="size-3.5 shrink-0" />
    <input
      type="text"
      value={filters.search}
      placeholder="Search teams or email..."
      maxlength="100"
      oninput={event => updateSearch(event.currentTarget.value)}
      class="placeholder:text-foreground-l4 text-foreground-l1 min-w-0 flex-1 bg-transparent text-sm outline-none"
    />
  </div>
{/snippet}

<div
  class="bg-background-l1 sticky left-0 z-20 flex min-w-0 items-center gap-3 overflow-visible border-b-2 px-3 py-2"
  style:width={pinnedToolbarWidth}
>
  {#if isMobile}
    <TeamsMobileFilterDrawer bind:filters {divisionOptions} />
  {:else}
    <TeamsDesktopFilterControls bind:filters {divisionOptions} />
  {/if}

  {@render searchInput()}

  {#if hasFilters}
    <button
      type="button"
      class="text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l3 flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-sm transition-colors"
      onclick={() => clearTeamFilters(filters)}
    >
      <IconX class="size-3.5" />
      Clear
    </button>
  {/if}

  {#if isFetching}
    <Spinner class="text-foreground-l3 size-4 shrink-0" />
  {/if}
</div>
