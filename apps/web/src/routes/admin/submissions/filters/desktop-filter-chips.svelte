<script lang="ts">
  import { SubmissionKind, SubmissionTeamStatus } from '@rctf/types'
  import { Avatar, DropdownMenu, Tooltip } from '$lib/components'
  import {
    IconChevronDown,
    IconClockFilled,
    IconFlag3Filled,
    IconGavel,
    IconRobot,
    IconShieldFilled,
    IconX,
  } from '$lib/icons'
  import { cn, getCategoryConfig, getCategoryStyle, getInitials } from '$lib/utils'
  import { mergeProps } from 'bits-ui'
  import {
    clearTimeRangeFilter,
    hasTimeRangeFilter,
    setFilterMode,
    type MultiFilter,
    type SubmissionFilters,
  } from '../submissions-filters'
  import {
    kindLabel,
    teamStatusLabel,
    type CategoryFilterOption,
    type ChallengeFilterOption,
    type TeamFilterOption,
  } from '../submissions-utils'
  import SubmissionResultText from '../table/result-text.svelte'
  import SubmissionsFilterModeMenu from './filter-mode-menu.svelte'
  import SubmissionsFilterOptionList from './filter-option-list.svelte'
  import SubmissionsTimeRangeEditor from './time-range-editor.svelte'
  import type { ValueFilterFamily } from './ui'

  interface Props {
    filters: SubmissionFilters
    valueFamilies: readonly ValueFilterFamily[]
    timeRangeSummary: string
    timeRangeError?: string
  }

  let {
    filters = $bindable<SubmissionFilters>(),
    valueFamilies,
    timeRangeSummary,
    timeRangeError,
  }: Props = $props()

  function valueFilter(family: ValueFilterFamily): MultiFilter<unknown> {
    return filters[family.id] as MultiFilter<unknown>
  }

  const tooltipTether = Tooltip.createTether<string>()
</script>

{#snippet valueFilterCount(family: ValueFilterFamily)}
  {@const filter = valueFilter(family)}
  <span class="text-foreground-l1 min-w-0 truncate">
    {filter.selected.length}
    {family.pluralLabel}
  </span>
{/snippet}

{#snippet challengeChipValue(family: ValueFilterFamily)}
  {@const selected = filters.challenge.selected[0] as ChallengeFilterOption | undefined}
  {@const category = selected ? getCategoryConfig(selected.category) : null}
  {#if filters.challenge.selected.length === 1 && selected}
    <span class="min-w-0 truncate" style={category ? getCategoryStyle(category.color) : undefined}>
      <span class="text-category-foreground-l1">{selected.category} /</span>
      <span class="text-category-foreground-l0">{selected.name}</span>
    </span>
  {:else}
    {@render valueFilterCount(family)}
  {/if}
{/snippet}

{#snippet teamChipValue(family: ValueFilterFamily)}
  {@const selected = filters.team.selected[0] as TeamFilterOption | undefined}
  {#if filters.team.selected.length === 1 && selected}
    <Avatar.Root class="size-4 rounded">
      {#if selected.avatarUrl}
        <Avatar.Image src={selected.avatarUrl} alt={selected.name} class="rounded object-cover" />
      {/if}
      <Avatar.Fallback class="rounded text-[8px]">
        {getInitials(selected.name)}
      </Avatar.Fallback>
    </Avatar.Root>
    <span class="min-w-0 truncate">{selected.name}</span>
  {:else}
    {@render valueFilterCount(family)}
  {/if}
{/snippet}

{#snippet kindChipValue(family: ValueFilterFamily)}
  {@const selected = filters.kind.selected[0]}
  {#if filters.kind.selected.length === 1 && selected}
    {#if selected === SubmissionKind.ADMIN_BOT}
      <IconRobot class="size-3.5" />
    {:else}
      <IconFlag3Filled class="size-3.5" />
    {/if}
    <span class="text-foreground-l1 min-w-0 truncate">{kindLabel(selected)}</span>
  {:else}
    {@render valueFilterCount(family)}
  {/if}
{/snippet}

{#snippet resultChipValue(family: ValueFilterFamily)}
  {@const selected = filters.result.selected[0]}
  {#if filters.result.selected.length === 1 && selected}
    <SubmissionResultText result={selected} />
  {:else}
    {@render valueFilterCount(family)}
  {/if}
{/snippet}

{#snippet teamStatusChipValue(family: ValueFilterFamily)}
  {@const selected = filters.teamStatus.selected[0]}
  {#if filters.teamStatus.selected.length === 1 && selected}
    {#if selected === SubmissionTeamStatus.BANNED}
      <IconGavel class="size-3.5" />
    {:else}
      <IconShieldFilled class="size-3.5" />
    {/if}
    <span class="text-foreground-l1 min-w-0 truncate">{teamStatusLabel(selected)}</span>
  {:else}
    {@render valueFilterCount(family)}
  {/if}
{/snippet}

{#snippet categoryChipValue(family: ValueFilterFamily)}
  {@const selected = filters.category.selected[0] as CategoryFilterOption | undefined}
  {@const category = selected ? getCategoryConfig(selected.value) : null}
  {#if filters.category.selected.length === 1 && selected}
    <span class="min-w-0 truncate" style={category ? getCategoryStyle(category.color) : undefined}>
      <span class="text-category-foreground-l0">{selected.label}</span>
    </span>
  {:else}
    {@render valueFilterCount(family)}
  {/if}
{/snippet}

{#snippet divisionChipValue(family: ValueFilterFamily)}
  {@const selected = filters.division.selected[0]}
  {#if filters.division.selected.length === 1 && selected}
    <span class="text-foreground-l1 min-w-0 truncate">{selected.label}</span>
  {:else}
    {@render valueFilterCount(family)}
  {/if}
{/snippet}

{#snippet valueFilterChipValue(family: ValueFilterFamily)}
  {#if family.id === 'challenge'}
    {@render challengeChipValue(family)}
  {:else if family.id === 'team'}
    {@render teamChipValue(family)}
  {:else if family.id === 'kind'}
    {@render kindChipValue(family)}
  {:else if family.id === 'result'}
    {@render resultChipValue(family)}
  {:else if family.id === 'teamStatus'}
    {@render teamStatusChipValue(family)}
  {:else if family.id === 'category'}
    {@render categoryChipValue(family)}
  {:else if family.id === 'division'}
    {@render divisionChipValue(family)}
  {/if}
{/snippet}

{#snippet valueFilterChip(family: ValueFilterFamily)}
  {@const filter = valueFilter(family)}
  <span
    class={cn(
      'bg-background-l2 inline-flex h-8 shrink-0 items-center overflow-hidden rounded-md border-2 text-sm',
      family.chipWidth === 'challenge' && 'max-w-96',
      family.chipWidth === 'team' && 'max-w-80'
    )}
  >
    <span class="text-foreground-l3 flex h-full items-center gap-1 border-r-2 px-2">
      <family.icon class="size-3.5" />
      {family.label}
    </span>
    <SubmissionsFilterModeMenu
      mode={filter.mode}
      count={filter.selected.length}
      onSelect={mode => setFilterMode(filter, mode)}
    />
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        class="hover:bg-background-l3 flex h-full min-w-0 items-center gap-1.5 px-2 transition-colors"
      >
        {@render valueFilterChipValue(family)}
        <IconChevronDown class="text-foreground-l4 size-3 shrink-0" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        align="start"
        class={cn(
          'bg-background-l4 border-foreground-l4/40 z-120 border-2 shadow-xl',
          family.menuSize === 'search' && 'flex h-80 w-72 flex-col overflow-hidden p-0!',
          family.menuSize === 'narrow' && 'w-48',
          family.menuSize === 'medium' && 'w-56'
        )}
      >
        <SubmissionsFilterOptionList {family} searchable={!!family.search} />
      </DropdownMenu.Content>
    </DropdownMenu.Root>
    <Tooltip.Trigger
      tether={tooltipTether}
      payload={`Remove ${family.label.toLowerCase()} filters`}
    >
      {#snippet child({ props })}
        {@const buttonProps = mergeProps(props, {
          onclick: () => family.clear(),
          'aria-label': `Remove ${family.label.toLowerCase()} filters`,
        })}
        <button
          {...buttonProps}
          type="button"
          class="text-foreground-l3 hover:text-foreground-l1 flex h-full w-7 shrink-0 items-center justify-center border-l-2"
        >
          <IconX class="size-3.5" />
        </button>
      {/snippet}
    </Tooltip.Trigger>
  </span>
{/snippet}

{#snippet timeRangeChip()}
  <span
    class={cn(
      'bg-background-l2 inline-flex h-8 max-w-lg shrink-0 items-center overflow-hidden rounded-md border-2 text-sm',
      timeRangeError && 'border-foreground-destructive/70'
    )}
  >
    <span class="text-foreground-l3 flex h-full items-center gap-1 border-r-2 px-2">
      <IconClockFilled class="size-3.5" />
      Time
    </span>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        class="text-foreground-l1 hover:bg-background-l3 flex h-full min-w-0 items-center gap-1.5 px-2 transition-colors"
      >
        <span class="min-w-0 truncate">{timeRangeSummary}</span>
        <IconChevronDown class="text-foreground-l4 size-3 shrink-0" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        align="start"
        class="bg-background-l4 border-foreground-l4/40 z-120 w-72 border-2 p-0! shadow-xl"
      >
        <SubmissionsTimeRangeEditor bind:filters {timeRangeError} />
      </DropdownMenu.Content>
    </DropdownMenu.Root>
    <Tooltip.Trigger tether={tooltipTether} payload="Remove time filter">
      {#snippet child({ props })}
        {@const buttonProps = mergeProps(props, {
          onclick: () => clearTimeRangeFilter(filters.time),
          'aria-label': 'Remove time filter',
        })}
        <button
          {...buttonProps}
          type="button"
          class="text-foreground-l3 hover:text-foreground-l1 flex h-full w-7 shrink-0 items-center justify-center border-l-2"
        >
          <IconX class="size-3.5" />
        </button>
      {/snippet}
    </Tooltip.Trigger>
  </span>
{/snippet}

<div
  class="hidden min-w-0 flex-1 flex-wrap items-center gap-1.5 overflow-visible whitespace-nowrap md:flex"
>
  {#each valueFamilies as family (family.id)}
    {#if valueFilter(family).selected.length > 0}
      {@render valueFilterChip(family)}
    {/if}
  {/each}
  {#if hasTimeRangeFilter(filters.time)}
    {@render timeRangeChip()}
  {/if}
</div>

<Tooltip.Root tether={tooltipTether}>
  {#snippet children({ payload })}
    {#if payload}
      <Tooltip.Content side="top" sideOffset={8}>{payload}</Tooltip.Content>
    {/if}
  {/snippet}
</Tooltip.Root>
