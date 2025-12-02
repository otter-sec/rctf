<script lang="ts">
  import { Tooltip } from '$lib/components'
  import { cn } from '$lib/utils'
  import { getCategoryStyle } from '$lib/utils/categories'
  import Graph from './scores-graph.svelte'
  import type { CategoryGroup, Challenge, SortMode } from './types'

  interface Props {
    challenges: Challenge[]
    categoryGroups: CategoryGroup[]
    hoveredTeamId: string | null
    sortMode: SortMode
    graphOffset: number
    teamColWidth: number
    cellWidth: number
    nameRowHeight: number
    headerHeight: number
  }

  let {
    challenges,
    categoryGroups,
    hoveredTeamId,
    sortMode,
    graphOffset,
    teamColWidth,
    cellWidth,
    nameRowHeight,
    headerHeight,
  }: Props = $props()
</script>

<div class="sticky top-0 z-20 flex w-max bg-background-l0">
  <div
    class="sticky left-0 z-30 shrink-0 bg-background-l0 pr-2"
    style:width="{teamColWidth}px"
    style:height="{headerHeight}px"
  >
    <Graph class="size-full" {hoveredTeamId} offset={graphOffset} />
  </div>

  <div class="flex flex-col">
    <div class="flex items-end pr-4" style:height="{nameRowHeight}px">
      {#each challenges as challenge, i}
        {@const prevCategory = challenges[i - 1]?.category}
        {@const hasGapBefore = sortMode === 'category' && i > 0 && prevCategory !== challenge.category}
        <div
          class={cn('relative w-12', hasGapBefore && 'ml-1')}
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

    <div class="flex items-stretch pr-4">
      {#if sortMode === 'solves'}
        {#each challenges as challenge}
          {@const Icon = challenge.config.icon}
          <div
            class="relative flex flex-col rounded-t-lg bg-category-background-l0 before:absolute before:inset-0 before:-z-10 before:rounded-t-lg before:bg-background-l0"
            style={getCategoryStyle(challenge.config.color)}
          >
            <div class="flex py-1.5">
              <Tooltip.Root>
                <Tooltip.Trigger class="flex w-12 items-center justify-center">
                  <span
                    class="flex size-5 items-center justify-center rounded bg-category-background-l1 text-sm leading-none text-category-foreground-l1 opacity-75"
                  >
                    {challenge.points}
                  </span>
                </Tooltip.Trigger>
                <Tooltip.Content side="bottom" sideOffset={4}>
                  <p>{challenge.name}</p>
                  <p class="text-foreground-l3">
                    {challenge.points} pts · {challenge.solves} solve{challenge.solves !== 1 ? 's' : ''}
                  </p>
                </Tooltip.Content>
              </Tooltip.Root>
            </div>

            <div class="flex items-center justify-center px-2 pb-1.5">
              <Tooltip.Root>
                <Tooltip.Trigger
                  class="flex items-center justify-center text-category-foreground-l1"
                >
                  <Icon class="mt-0.5 size-5" />
                </Tooltip.Trigger>
                <Tooltip.Content side="bottom" sideOffset={4}>
                  <span class="capitalize">{challenge.config.name}</span>
                </Tooltip.Content>
              </Tooltip.Root>
            </div>
          </div>
        {/each}
      {:else}
        {#each categoryGroups as group, i}
          {@const Icon = group.config.icon}
          {@const showLabel = group.challenges.length > 1}
          <div
            class={cn(
              'relative flex flex-col rounded-t-lg bg-category-background-l0',
              'before:absolute before:inset-0 before:-z-10 before:rounded-t-lg before:bg-background-l0',
              i < categoryGroups.length - 1 && 'mr-1'
            )}
            style={getCategoryStyle(group.config.color)}
          >
            <div class="flex py-1.5">
              {#each group.challenges as challenge}
                <Tooltip.Root>
                  <Tooltip.Trigger class="flex w-12 items-center justify-center">
                    <span
                      class="flex size-5 items-center justify-center rounded bg-category-background-l1 text-sm leading-none text-category-foreground-l1 opacity-75"
                    >
                      {challenge.points}
                    </span>
                  </Tooltip.Trigger>
                  <Tooltip.Content side="bottom" sideOffset={4}>
                    <p>{challenge.name}</p>
                    <p class="text-foreground-l3">
                      {challenge.points} pts · {challenge.solves} solve{challenge.solves !== 1 ? 's' : ''}
                    </p>
                  </Tooltip.Content>
                </Tooltip.Root>
              {/each}
            </div>

            <div
              class="flex items-center justify-center gap-1 overflow-hidden px-2 pb-1.5"
              style:max-width="{group.challenges.length * cellWidth}px"
            >
              {#if showLabel}
                <Icon class="size-5 shrink-0 text-category-foreground-l1" />
                <span class="truncate capitalize text-category-foreground-l1">
                  {group.config.name}
                </span>
              {:else}
                <Tooltip.Root>
                  <Tooltip.Trigger
                    class="flex items-center justify-center text-category-foreground-l1"
                  >
                    <Icon class="mt-0.5 size-5" />
                  </Tooltip.Trigger>
                  <Tooltip.Content side="bottom" sideOffset={4}>
                    <span class="capitalize">{group.config.name}</span>
                  </Tooltip.Content>
                </Tooltip.Root>
              {/if}
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>
