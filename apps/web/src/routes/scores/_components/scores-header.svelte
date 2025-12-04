<script lang="ts">
  import { Tooltip } from '$lib/components'
  import { cn } from '$lib/utils'
  import { getCategoryStyle } from '$lib/utils/categories'
  import type { CategoryGroup, Challenge, SortMode, ViewMode } from '../_lib'
  import Graph from './scores-graph.svelte'

  interface Props {
    challenges: Challenge[]
    categoryGroups: CategoryGroup[]
    hoveredTeamId: string | null
    sortMode: SortMode
    viewMode: ViewMode
    isFetching?: boolean
    graphOffset: number
    teamColWidth: number
    cellWidth: number
    nameRowHeight: number
    headerHeight: number
    solveHighlight?: { teamId: string; time: number } | null
  }

  let {
    challenges,
    categoryGroups,
    hoveredTeamId,
    sortMode,
    viewMode,
    isFetching = false,
    graphOffset,
    teamColWidth,
    cellWidth,
    nameRowHeight,
    headerHeight,
    solveHighlight = null,
  }: Props = $props()

  const isBoomer = $derived(viewMode === 'boomer')
</script>

{#snippet challengeTooltip(challenge: Challenge)}
  <p>{challenge.name}</p>
  <p class="text-foreground-l3">
    {challenge.points} pts · {challenge.solves} solve{challenge.solves !== 1
      ? 's'
      : ''}
  </p>
{/snippet}

{#snippet pointsBadge(challenge: Challenge)}
  <Tooltip.Root>
    <Tooltip.Trigger class="flex w-12 items-center justify-center">
      <span
        class="flex size-5 items-center justify-center rounded bg-category-background-l1 text-sm leading-none text-category-foreground-l1 opacity-75"
      >
        {challenge.points}
      </span>
    </Tooltip.Trigger>
    <Tooltip.Content side="bottom" sideOffset={4}>
      {@render challengeTooltip(challenge)}
    </Tooltip.Content>
  </Tooltip.Root>
{/snippet}

{#snippet categoryIcon(
  config: CategoryGroup['config'],
  showLabel: boolean = false,
  maxWidth?: number
)}
  {@const Icon = config.icon}
  <div
    class="flex items-center justify-center gap-1 overflow-hidden px-2 pb-1.5"
    style:max-width={maxWidth ? `${maxWidth}px` : undefined}
  >
    {#if showLabel}
      <Icon class="size-5 shrink-0 text-category-foreground-l1" />
      <span class="truncate capitalize text-category-foreground-l1"
        >{config.name}</span
      >
    {:else}
      <Tooltip.Root>
        <Tooltip.Trigger
          class="flex items-center justify-center text-category-foreground-l1"
        >
          <Icon class="my-0.5 size-5" />
        </Tooltip.Trigger>
        <Tooltip.Content side="bottom" sideOffset={4}>
          <span class="capitalize">{config.name}</span>
        </Tooltip.Content>
      </Tooltip.Root>
    {/if}
  </div>
{/snippet}

{#snippet categoryBadge(group: CategoryGroup)}
  {@const Icon = group.config.icon}
  {@const count = group.challenges.length}
  {@const totalPoints = group.challenges.reduce((sum, c) => sum + c.points, 0)}
  <Tooltip.Root>
    <Tooltip.Trigger class="flex w-12 items-center justify-center">
      <span
        class="flex size-5 items-center justify-center rounded bg-category-background-l1 text-sm leading-none text-category-foreground-l1 opacity-75"
      >
        {totalPoints}
      </span>
    </Tooltip.Trigger>
    <Tooltip.Content side="bottom" sideOffset={4}>
      <p class="capitalize">{group.config.name}</p>
      <p class="text-foreground-l3">
        {count} challenge{count !== 1 ? 's' : ''} · {totalPoints} pts
      </p>
    </Tooltip.Content>
  </Tooltip.Root>
{/snippet}

{#snippet categoryIconOnly(config: CategoryGroup['config'])}
  {@const Icon = config.icon}
  <div class="flex items-center justify-center px-2 pb-1.5">
    <Tooltip.Root>
      <Tooltip.Trigger
        class="flex items-center justify-center text-category-foreground-l1"
      >
        <Icon class="my-0.5 size-5" />
      </Tooltip.Trigger>
      <Tooltip.Content side="bottom" sideOffset={4}>
        <span class="capitalize">{config.name}</span>
      </Tooltip.Content>
    </Tooltip.Root>
  </div>
{/snippet}

<div class="sticky top-0 z-20 flex bg-background-l0">
  <div
    class="sticky left-0 z-30 shrink-0 bg-background-l0 pr-2"
    style:width="{teamColWidth}px"
    style:height="{headerHeight}px"
  >
    {#if !isFetching}
      <Graph
        class="size-full"
        {hoveredTeamId}
        offset={graphOffset}
        {solveHighlight}
      />
    {/if}
  </div>

  <div class="flex flex-col">
    <div
      class={cn('flex items-end pr-4', !isBoomer && 'gap-1')}
      style:height="{nameRowHeight}px"
    >
      {#if isBoomer}
        <div class="flex gap-1 translate-x-1">
          {#each categoryGroups as group}
            <div
              class="relative w-12"
              style:height="{nameRowHeight}px"
              style={getCategoryStyle(group.config.color)}
            >
              <span
                class="absolute bottom-0 left-1/2 max-w-[150px] origin-bottom-left -rotate-45 truncate text-lg capitalize text-category-foreground-l1"
              >
                {group.config.name}
              </span>
            </div>
          {/each}
        </div>
      {:else if sortMode === 'category'}
        {#each categoryGroups as group}
          <div class="flex gap-1 translate-x-1">
            {#each group.challenges as challenge}
              <div
                class="relative w-12"
                style:height="{nameRowHeight}px"
                style={getCategoryStyle(challenge.config.color)}
              >
                <span
                  class="absolute bottom-0 left-1/2 max-w-[150px] origin-bottom-left -rotate-45 truncate text-lg text-category-foreground-l1"
                >
                  {challenge.name}
                </span>
              </div>
            {/each}
          </div>
        {/each}
      {:else}
        {#each challenges as challenge}
          <div
            class="relative w-12"
            style:height="{nameRowHeight}px"
            style={getCategoryStyle(challenge.config.color)}
          >
            <span
              class="absolute bottom-0 left-1/2 max-w-[150px] origin-bottom-left -rotate-45 truncate text-lg text-category-foreground-l1"
            >
              {challenge.name}
            </span>
          </div>
        {/each}
      {/if}
    </div>

    <div class={cn('flex items-stretch pr-4', !isBoomer && 'gap-1')}>
      {#if isBoomer}
        <div class="flex gap-1">
          {#each categoryGroups as group}
            <div
              class="relative flex flex-col rounded-t-lg bg-category-background-l0 before:absolute before:inset-0 before:-z-10 before:rounded-t-lg before:bg-background-l0"
              style={getCategoryStyle(group.config.color)}
            >
              <div class="flex py-1.5">
                {@render categoryBadge(group)}
              </div>
              {@render categoryIconOnly(group.config)}
            </div>
          {/each}
        </div>
      {:else if sortMode === 'solves'}
        {#each challenges as challenge}
          <div
            class="relative flex flex-col rounded-t-lg bg-category-background-l0 before:absolute before:inset-0 before:-z-10 before:rounded-t-lg before:bg-background-l0"
            style={getCategoryStyle(challenge.config.color)}
          >
            <div class="flex py-1.5 gap-1">
              {@render pointsBadge(challenge)}
            </div>
            {@render categoryIcon(challenge.config)}
          </div>
        {/each}
      {:else}
        {#each categoryGroups as group}
          <div
            class="relative flex flex-col rounded-t-lg bg-category-background-l0 before:absolute before:inset-0 before:-z-10 before:rounded-t-lg before:bg-background-l0"
            style={getCategoryStyle(group.config.color)}
          >
            <div class="flex py-1.5 gap-1">
              {#each group.challenges as challenge}
                {@render pointsBadge(challenge)}
              {/each}
            </div>
            {@render categoryIcon(
              group.config,
              group.challenges.length > 1,
              group.challenges.length * cellWidth
            )}
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>
