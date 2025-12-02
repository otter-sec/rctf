<script lang="ts">
  import { cn } from '$lib/utils'
  import { getCategoryStyle } from '$lib/utils/categories'
  import Cell from './scores-zoomer-cell.svelte'
  import TeamInfo from './scores-team-info.svelte'
  import type {
    CategoryGroup,
    Challenge,
    LeaderboardEntry,
    SortMode,
    TooltipData,
  } from './types'

  interface Props {
    entry: LeaderboardEntry
    rank: number
    challenges: Challenge[]
    categoryGroups: CategoryGroup[]
    solves: Map<string, { id: string; solveTime: number }>
    isCurrentUser: boolean
    teamColWidth: number
    sortMode: SortMode
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
    onHover,
    onCellHover,
  }: Props = $props()

  function showTooltip(e: MouseEvent, data: TooltipData) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    onCellHover?.(data, rect.left + rect.width / 2, rect.top)
  }
</script>

{#snippet cell(challenge: Challenge, isFirst: boolean = false)}
  {@const solve = solves.get(challenge.id)}
  {@const bloodIndex =
    challenge.firstSolvers?.findIndex(s => s.id === entry.id) ?? -1}
  <div
    class={cn('flex h-16 w-12 items-center justify-center', isFirst && 'rounded-l-lg')}
    style={getCategoryStyle(challenge.config.color)}
  >
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="flex items-center justify-center"
      onmouseenter={e =>
        showTooltip(e, {
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

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="group flex w-max rounded-lg bg-background-l2 hover:bg-background-l3"
  onmouseenter={onHover}
>
  <TeamInfo
    id={entry.id}
    name={entry.name}
    score={entry.score}
    solveCount={entry.solves.length}
    avatarUrl={entry.avatarUrl}
    {rank}
    {isCurrentUser}
    width={teamColWidth}
  />

  <div class={cn('flex pr-4', sortMode === 'category' && 'gap-1')}>
    {#if sortMode === 'category'}
      {#each categoryGroups as group}
        <div class="flex gap-1">
          {#each group.challenges as challenge, i}
            {@render cell(challenge, i === 0)}
          {/each}
        </div>
      {/each}
    {:else}
      {#each challenges as challenge}
        {@render cell(challenge)}
      {/each}
    {/if}
  </div>
</div>
