<script lang="ts">
  import { cn } from '$lib/utils'
  import { getCategoryStyle } from '$lib/utils/categories'
  import Cell from './scores-zoomer-cell.svelte'
  import TeamInfo from './scores-team-info.svelte'
  import type {
    Challenge,
    LeaderboardEntry,
    SortMode,
    TooltipData,
  } from './types'

  interface Props {
    entry: LeaderboardEntry
    rank: number
    challenges: Challenge[]
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

  <div class="flex pr-4">
    {#each challenges as challenge, i}
      {@const solve = solves.get(challenge.id)}
      {@const bloodIndex =
        challenge.firstSolvers?.findIndex(s => s.id === entry.id) ?? -1}
      {@const prevCat = challenges[i - 1]?.category}
      {@const nextCat = challenges[i + 1]?.category}
      {@const isFirst =
        sortMode === 'category' && (i === 0 || prevCat !== challenge.category)}
      {@const isLast =
        sortMode === 'category' &&
        (i === challenges.length - 1 || nextCat !== challenge.category)}
      <div
        class={cn(
          'flex h-16 w-12 items-center justify-center',
          isFirst && 'rounded-l-lg',
          isLast && i < challenges.length - 1 && 'mr-1'
        )}
        style={getCategoryStyle(challenge.config.color)}
      >
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
    {/each}
  </div>
</div>

