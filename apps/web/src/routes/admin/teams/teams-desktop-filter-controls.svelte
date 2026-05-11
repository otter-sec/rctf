<script lang="ts">
  import TeamsDesktopFilterChips from './teams-desktop-filter-chips.svelte'
  import TeamsDesktopFilterMenu from './teams-desktop-filter-menu.svelte'
  import type { DivisionFilterOption, TeamFilters } from './teams-model'

  interface Props {
    filters: TeamFilters
    divisionOptions: DivisionFilterOption[]
  }

  let { filters = $bindable<TeamFilters>(), divisionOptions }: Props = $props()
</script>

<TeamsDesktopFilterMenu bind:filters {divisionOptions} />
<TeamsDesktopFilterChips bind:filters {divisionOptions} />
