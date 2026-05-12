<script lang="ts">
  import { DropdownMenu, ScrollArea, Spinner } from '$lib/components'
  import { IconClockFilled, IconFilter } from '$lib/icons'
  import { cn } from '$lib/utils'
  import SubmissionsFilterOptionList from './filter-option-list.svelte'
  import SubmissionsFilterOption from './filter-option.svelte'
  import SubmissionsFilterSearchInput from './filter-search-input.svelte'
  import type { SubmissionFilters } from './query'
  import SubmissionsTimeRangeEditor from './time-range-editor.svelte'
  import {
    rootFilterOptionKey,
    type RootFilterOptionMatch,
    type TimeFilterFamily,
    type ValueFilterFamily,
  } from './ui'

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
    timeRangeError,
  }: Props = $props()
</script>

{#snippet valueFilterMenu(family: ValueFilterFamily)}
  <DropdownMenu.Sub>
    <DropdownMenu.SubTrigger
      class="text-foreground-l2 data-highlighted:!bg-background-l5 data-highlighted:!text-foreground-l2 data-[state=open]:!bg-background-l5 data-[state=open]:!text-foreground-l2"
    >
      <family.icon class="size-4" />
      {family.label}
    </DropdownMenu.SubTrigger>
    <DropdownMenu.SubContent
      align="start"
      alignOffset={-6}
      sideOffset={10}
      class={cn(
        'bg-background-l4 border-foreground-l4/40 z-[110] border-2 shadow-xl',
        family.menuSize === 'search' && 'flex h-80 w-72 flex-col overflow-hidden !p-0',
        family.menuSize === 'narrow' && 'w-48',
        family.menuSize === 'medium' && 'w-56'
      )}
    >
      <SubmissionsFilterOptionList {family} searchable={!!family.search} />
    </DropdownMenu.SubContent>
  </DropdownMenu.Sub>
{/snippet}

{#snippet timeRangeFilterMenu()}
  <DropdownMenu.Sub>
    <DropdownMenu.SubTrigger
      class="text-foreground-l2 data-highlighted:!bg-background-l5 data-highlighted:!text-foreground-l2 data-[state=open]:!bg-background-l5 data-[state=open]:!text-foreground-l2"
    >
      <IconClockFilled class="size-4" />
      {timeFamily.label}
    </DropdownMenu.SubTrigger>
    <DropdownMenu.SubContent
      align="start"
      alignOffset={-6}
      sideOffset={10}
      class="bg-background-l4 border-foreground-l4/40 z-[110] w-72 border-2 !p-0 shadow-xl"
    >
      <SubmissionsTimeRangeEditor bind:filters {timeRangeError} />
    </DropdownMenu.SubContent>
  </DropdownMenu.Sub>
{/snippet}

{#snippet rootFilterList()}
  <div class="p-1">
    {#each valueFamilies as family (family.id)}
      {@render valueFilterMenu(family)}
    {/each}
    {@render timeRangeFilterMenu()}
  </div>
{/snippet}

{#snippet rootFilterSearchResults()}
  <div class="p-1">
    {#each rootValueFamilyMatches as family (family.id)}
      {@render valueFilterMenu(family)}
    {/each}
    {#if rootTimeFamilyMatches}
      {@render timeRangeFilterMenu()}
    {/if}
    {#each rootOptionMatches as match (rootFilterOptionKey(match))}
      <SubmissionsFilterOption family={match.family} option={match.option} showPath />
    {/each}
    {#if isSearchingTeams}
      <div class="text-foreground-l3 flex items-center gap-2 px-2 py-1.5 text-sm">
        <Spinner class="size-3.5" />
        Searching teams...
      </div>
    {/if}
    {#if !hasRootSearchMatches && !isSearchingTeams}
      <div class="text-foreground-l3 px-2 py-1.5 text-sm">No filters found</div>
    {/if}
  </div>
{/snippet}

<DropdownMenu.Root>
  <DropdownMenu.Trigger
    aria-label="Add filter"
    class={cn(
      'bg-background-l4 text-foreground-l2 hover:bg-background-l5 hover:text-foreground-l1 flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors',
      hasFilters && 'text-foreground-accent'
    )}
  >
    <IconFilter class="size-4" />
  </DropdownMenu.Trigger>
  <DropdownMenu.Content
    align="start"
    class="bg-background-l4 border-foreground-l4/40 z-[100] w-80 overflow-hidden border-2 !p-0 shadow-xl"
  >
    <SubmissionsFilterSearchInput
      value={rootFilterSearch}
      placeholder="Search filters..."
      onInput={value => (rootFilterSearch = value)}
    />
    {#key rootFilterScrollKey}
      {#if isRootSearchActive}
        <ScrollArea
          class="h-[min(29rem,calc(var(--bits-dropdown-menu-content-available-height)-2.75rem))]"
          fadeSize={28}
          fadeColor="background-l4"
          scrollbarYClasses="hidden"
        >
          {@render rootFilterSearchResults()}
        </ScrollArea>
      {:else}
        <ScrollArea
          class="max-h-[min(29rem,calc(var(--bits-dropdown-menu-content-available-height)-2.75rem))]"
          fadeSize={28}
          fadeColor="background-l4"
          scrollbarYClasses="hidden"
        >
          {@render rootFilterList()}
        </ScrollArea>
      {/if}
    {/key}
  </DropdownMenu.Content>
</DropdownMenu.Root>
