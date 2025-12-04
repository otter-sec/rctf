<script lang="ts">
  import { Tooltip } from '$lib/components'
  import { IconCircleCheckFilled, IconCircleDashed } from '$lib/icons'
  import { cn } from '$lib/utils'
  import { getCategoryStyle } from '$lib/utils/categories'
  import type {
    CategoryGroup,
    Challenge,
    LeaderboardEntry,
    SortMode,
    TooltipData,
    ViewMode,
  } from '../_lib'
  import Cell from './scores-cell.svelte'
  import Progress from './scores-progress.svelte'
  import TeamInfo from './scores-team-info.svelte'

  interface Props {
    entry: LeaderboardEntry
    rank: number
    challenges: Challenge[]
    categoryGroups: CategoryGroup[]
    solves: Map<string, { id: string; solveTime: number }>
    isCurrentUser: boolean
    teamColWidth: number
    sortMode: SortMode
    viewMode: ViewMode
    onHover?: () => void
    onCellHover?: (data: TooltipData | null, x: number, y: number) => void
  }

  let {
    entry,
    rank,
    challenges,
    categoryGroups,
    solves,
    isCurrentUser,
    teamColWidth,
    sortMode,
    viewMode,
    onHover,
    onCellHover,
  }: Props = $props()

  const isBoomer = $derived(viewMode === 'boomer')

  const categoryStats = $derived(
    categoryGroups.map(group => {
      const total = group.challenges.length
      const solved = group.challenges.filter(c => solves.has(c.id)).length
      return {
        ...group,
        total,
        solved,
        percent: (solved / total) * 100,
        status: solved === total ? 'complete' : solved > 0 ? 'partial' : 'none',
      } as const
    })
  )

  function showTooltip(e: MouseEvent, data: TooltipData) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    onCellHover?.(data, rect.left + rect.width / 2, rect.top)
  }
</script>

{#snippet challengeCell(challenge: Challenge, isFirst: boolean = false)}
  {@const solve = solves.get(challenge.id)}
  {@const bloodIndex =
    challenge.firstSolvers?.findIndex(s => s.id === entry.id) ?? -1}
  <div
    class={cn(
      'flex h-16 w-12 items-center justify-center',
      isFirst && 'rounded-l-lg'
    )}
    style={getCategoryStyle(challenge.config.color)}
  >
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="flex items-center justify-center"
      onmouseenter={e =>
        showTooltip(e, {
          teamId: entry.id,
          challengeName: challenge.name,
          points: challenge.points,
          solved: !!solve,
          bloodIndex,
          solveTime: solve?.solveTime,
        })}
      onmouseleave={() => onCellHover?.(null, 0, 0)}
    >
      <Cell solved={!!solve} {bloodIndex} />
    </div>
  </div>
{/snippet}

{#snippet categoryCell(stat: (typeof categoryStats)[number])}
  <div
    class="flex h-16 w-12 items-center justify-center rounded-l-lg"
    style={getCategoryStyle(stat.config.color)}
  >
    <Tooltip.Root>
      <Tooltip.Trigger class="flex items-center justify-center">
        {#if stat.status === 'complete'}
          <IconCircleCheckFilled class="size-7 text-category-foreground-l1" />
        {:else if stat.status === 'partial'}
          <Progress percent={stat.percent} class="size-7 text-foreground-l4" />
        {:else}
          <IconCircleDashed class="size-7 text-foreground-l5/25" />
        {/if}
      </Tooltip.Trigger>
      <Tooltip.Content side="top" sideOffset={4}>
        <p class="capitalize">{stat.config.name}</p>
        <p class="text-foreground-l3">{stat.solved} / {stat.total} solved</p>
      </Tooltip.Content>
    </Tooltip.Root>
  </div>
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="group w-full bg-background-l2/50 rounded-lg hover:bg-background-l2"
  onmouseenter={onHover}
>
  <div
    class="flex rounded-lg bg-background-l2 group-hover:bg-background-l3 w-fit"
  >
    <TeamInfo
      id={entry.id}
      name={entry.name}
      score={entry.score}
      solveCount={entry.solves.length}
      avatarUrl={entry.avatarUrl}
      division={entry.division}
      divisionPlace={entry.divisionPlace}
      {rank}
      {isCurrentUser}
      width={teamColWidth}
    />

    {#if isBoomer}
      <div class="flex gap-1 pr-4">
        {#each categoryStats as stat}
          {@render categoryCell(stat)}
        {/each}
      </div>
    {:else}
      <div class="flex gap-1 pr-4">
        {#if sortMode === 'category'}
          {#each categoryGroups as group}
            <div class="flex gap-1">
              {#each group.challenges as challenge, i}
                {@render challengeCell(challenge, i === 0)}
              {/each}
            </div>
          {/each}
        {:else}
          {#each challenges as challenge}
            {@render challengeCell(challenge)}
          {/each}
        {/if}
      </div>
    {/if}
  </div>
</div>
