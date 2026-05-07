<script lang="ts">
  import { DropdownMenu } from '$lib/components'
  import { IconCheck, IconChevronDown, IconShieldFilled, IconUsersGroup, IconX } from '$lib/icons'
  import { cn } from '$lib/utils'
  import TeamStatusDot from './team-status-dot.svelte'
  import TeamsFilterOptions from './teams-filter-options.svelte'
  import {
    clearFilter,
    filterOperatorLabel,
    selectedCountLabel,
    setFilterMode,
    teamStatusLabel,
    type DivisionFilterOption,
    type FilterMode,
    type MultiFilter,
    type TeamFilters,
  } from './teams-model'

  interface Props {
    filters: TeamFilters
    divisionOptions: DivisionFilterOption[]
  }

  let { filters = $bindable<TeamFilters>(), divisionOptions }: Props = $props()
</script>

{#snippet operatorDropdown(mode: FilterMode, count: number, onSelect: (mode: FilterMode) => void)}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger
      class="text-foreground-l4 hover:bg-background-l3 hover:text-foreground-l2 flex h-full items-center gap-1 border-r-2 px-2 transition-colors"
    >
      {filterOperatorLabel(mode, count)}
      <IconChevronDown class="size-3" />
    </DropdownMenu.Trigger>
    <DropdownMenu.Content
      align="start"
      class="bg-background-l4 border-foreground-l4/40 z-[120] w-36 border-2 shadow-xl"
    >
      <DropdownMenu.Item
        class="text-foreground-l2 data-highlighted:!bg-background-l5 data-highlighted:!text-foreground-l2"
        onclick={() => onSelect('include')}
      >
        <IconCheck class={cn('size-4', mode !== 'include' && 'text-transparent')} />
        {count > 1 ? 'is any of' : 'is'}
      </DropdownMenu.Item>
      <DropdownMenu.Item
        class="text-foreground-l2 data-highlighted:!bg-background-l5 data-highlighted:!text-foreground-l2"
        onclick={() => onSelect('exclude')}
      >
        <IconCheck class={cn('size-4', mode !== 'exclude' && 'text-transparent')} />
        is not
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{/snippet}

{#snippet selectedCount(label: string, count: number)}
  <span class="text-foreground-l1 min-w-0 truncate">
    {selectedCountLabel(label, count)}
  </span>
{/snippet}

{#snippet statusChipValue()}
  {@const selected = filters.status.selected[0]}
  {#if filters.status.selected.length === 1 && selected}
    <TeamStatusDot status={selected} />
    <span class="text-foreground-l1 min-w-0 truncate">{teamStatusLabel(selected)}</span>
  {:else}
    {@render selectedCount('status', filters.status.selected.length)}
  {/if}
{/snippet}

{#snippet divisionChipValue()}
  {@const selected = filters.division.selected[0]}
  {#if filters.division.selected.length === 1 && selected}
    <span class="text-foreground-l1 min-w-0 truncate">{selected.label}</span>
  {:else}
    {@render selectedCount('division', filters.division.selected.length)}
  {/if}
{/snippet}

{#snippet valueFilterChip(label: string, filter: MultiFilter<unknown>, kind: 'status' | 'division')}
  <span
    class="bg-background-l2 inline-flex h-8 shrink-0 items-center overflow-hidden rounded-md border-2 text-sm"
  >
    <span class="text-foreground-l3 flex h-full items-center gap-1 border-r-2 px-2">
      {#if kind === 'status'}
        <IconShieldFilled class="size-3.5" />
      {:else}
        <IconUsersGroup class="size-3.5" />
      {/if}
      {label}
    </span>
    {@render operatorDropdown(filter.mode, filter.selected.length, mode =>
      setFilterMode(filter, mode)
    )}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        class="hover:bg-background-l3 flex h-full min-w-0 items-center gap-1.5 px-2 transition-colors"
      >
        {#if kind === 'status'}
          {@render statusChipValue()}
        {:else}
          {@render divisionChipValue()}
        {/if}
        <IconChevronDown class="text-foreground-l4 size-3 shrink-0" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        align="start"
        class="bg-background-l4 border-foreground-l4/40 z-[120] w-56 border-2 shadow-xl"
      >
        <TeamsFilterOptions {kind} bind:filters {divisionOptions} />
      </DropdownMenu.Content>
    </DropdownMenu.Root>
    <button
      type="button"
      aria-label="Remove {label.toLowerCase()} filters"
      class="text-foreground-l3 hover:text-foreground-l1 flex h-full w-7 shrink-0 items-center justify-center border-l-2"
      onclick={() => {
        if (kind === 'status') clearFilter(filters.status)
        else clearFilter(filters.division)
      }}
    >
      <IconX class="size-3.5" />
    </button>
  </span>
{/snippet}

<div
  class="hidden min-w-0 flex-1 flex-wrap items-center gap-1.5 overflow-visible whitespace-nowrap md:flex"
>
  {#if filters.status.selected.length > 0}
    {@render valueFilterChip('Status', filters.status, 'status')}
  {/if}
  {#if filters.division.selected.length > 0}
    {@render valueFilterChip('Division', filters.division, 'division')}
  {/if}
</div>
