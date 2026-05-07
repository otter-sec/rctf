<script lang="ts">
  import { DropdownMenu } from '$lib/components'
  import TeamStatusDot from './team-status-dot.svelte'
  import {
    TEAM_STATUS_FILTERS,
    teamStatusLabel,
    toggleFilterOption,
    type DivisionFilterOption,
    type TeamFilters,
    type TeamStatusFilter,
  } from './teams-model'

  interface Props {
    kind: 'status' | 'division'
    filters: TeamFilters
    divisionOptions: DivisionFilterOption[]
  }

  let { kind, filters = $bindable<TeamFilters>(), divisionOptions }: Props = $props()

  function toggleStatus(status: TeamStatusFilter) {
    toggleFilterOption(filters.status, status, item => item)
  }

  function toggleDivision(division: DivisionFilterOption) {
    toggleFilterOption(filters.division, division, item => item.value)
  }
</script>

{#snippet statusOption(status: TeamStatusFilter)}
  {@const selected = filters.status.selected.includes(status)}
  <DropdownMenu.CheckboxItem
    checked={selected}
    closeOnSelect={false}
    textValue={teamStatusLabel(status)}
    class="text-foreground-l2 hover:!bg-background-l5 hover:!text-foreground-l2 flex w-full min-w-0 cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none select-none"
    onCheckedChange={checked => {
      if (checked !== selected) toggleStatus(status)
    }}
  >
    <TeamStatusDot {status} />
    <span class="min-w-0 truncate">{teamStatusLabel(status)}</span>
  </DropdownMenu.CheckboxItem>
{/snippet}

{#snippet divisionOption(division: DivisionFilterOption)}
  {@const selected = filters.division.selected.some(item => item.value === division.value)}
  <DropdownMenu.CheckboxItem
    checked={selected}
    closeOnSelect={false}
    textValue={division.label}
    class="text-foreground-l2 hover:!bg-background-l5 hover:!text-foreground-l2 flex w-full min-w-0 cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none select-none"
    onCheckedChange={checked => {
      if (checked !== selected) toggleDivision(division)
    }}
  >
    <span class="min-w-0 truncate">{division.label}</span>
  </DropdownMenu.CheckboxItem>
{/snippet}

<div class="p-1">
  {#if kind === 'status'}
    {#each TEAM_STATUS_FILTERS as status}
      {@render statusOption(status)}
    {/each}
  {:else if divisionOptions.length === 0}
    <div class="text-foreground-l3 px-2 py-1.5 text-sm">No divisions found</div>
  {:else}
    {#each divisionOptions as division (division.value)}
      {@render divisionOption(division)}
    {/each}
  {/if}
</div>
