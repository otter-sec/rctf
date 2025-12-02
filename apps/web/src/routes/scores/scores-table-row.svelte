<script lang="ts">
  import { Avatar } from '$lib/components'
  import { cn, getInitials, getRankStylesForPosition } from '$lib/utils'
  import { getCategoryStyle } from '$lib/utils/categories'
  import Cell from './scores-table-cell.svelte'
  import type { Challenge, LeaderboardEntry, TooltipData } from './types'

  interface Props {
    entry: LeaderboardEntry
    rank: number
    challenges: Challenge[]
    solves: Map<string, { id: string; solveTime: number }>
    isCurrentUser: boolean
    teamColWidth: number
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
    onHover,
    onCellHover,
  }: Props = $props()

  const styles = $derived(getRankStylesForPosition(rank, isCurrentUser))

  function showTooltip(e: MouseEvent, data: TooltipData) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    onCellHover?.(data, rect.left + rect.width / 2, rect.top)
  }

  function hideTooltip() {
    onCellHover?.(null, 0, 0)
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="group flex w-max rounded-lg bg-background-l2 hover:bg-background-l3"
  onmouseenter={onHover}
>
  <div
    class={cn(
      'sticky left-0 z-10 flex h-16 shrink-0 items-center gap-3 rounded-l-lg px-4',
      styles.bg,
      'before:absolute before:inset-0 before:-z-10 before:rounded-l-lg before:bg-background-l2 group-hover:before:bg-background-l3',
      styles.gradient && [
        'after:absolute after:inset-y-0 after:left-0 after:-z-10 after:w-96 after:rounded-l-lg after:bg-linear-to-r after:to-transparent',
        styles.gradient,
      ]
    )}
    style:width="{teamColWidth}px"
  >
    <span class={cn('w-16 shrink-0 text-center text-xl tabular-nums', styles.fgL0)}>
      #{rank}
    </span>

    <Avatar.Root class="size-12 shrink-0 rounded-lg">
      {#if entry.avatarUrl}
        <Avatar.Image src={entry.avatarUrl} alt={entry.name} class="rounded-lg" />
      {/if}
      <Avatar.Fallback class="rounded-lg text-sm">
        {getInitials(entry.name)}
      </Avatar.Fallback>
    </Avatar.Root>

    <div class="flex h-full w-64 shrink-0 flex-col justify-center">
      <a href="/profile/{entry.id}" class={cn('truncate text-xl hover:underline', styles.fgL0)}>
        {entry.name}
      </a>
      <span class={cn('truncate text-base', styles.fgL1)}>Open Division</span>
    </div>

    <div class="flex w-28 shrink-0 flex-col items-end">
      <span class="text-xl tabular-nums text-foreground-l1">
        {entry.score.toLocaleString()} pts
      </span>
      <span class="text-base text-foreground-l3">
        {entry.solves.length} solve{entry.solves.length !== 1 ? 's' : ''}
      </span>
    </div>
  </div>

  <div class="flex">
    {#each challenges as challenge, i}
      {@const solve = solves.get(challenge.id)}
      {@const bloodIndex = challenge.firstSolvers?.findIndex(s => s.id === entry.id) ?? -1}
      {@const prevCategory = challenges[i - 1]?.category}
      {@const nextCategory = challenges[i + 1]?.category}
      {@const isFirst = i === 0 || prevCategory !== challenge.category}
      {@const isLast = i === challenges.length - 1 || nextCategory !== challenge.category}
      {@const tooltipData = {
        challengeName: challenge.name,
        points: challenge.points,
        solved: !!solve,
        bloodIndex,
        solveTime: solve?.solveTime,
      }}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class={cn(
          'flex h-16 w-12 items-center justify-center',
          isFirst && 'rounded-l-lg',
          isLast && i < challenges.length - 1 && 'mr-1'
        )}
        style={getCategoryStyle(challenge.config.color)}
        onmouseenter={e => showTooltip(e, tooltipData)}
        onmouseleave={hideTooltip}
      >
        <Cell solved={!!solve} {bloodIndex} />
      </div>
    {/each}
  </div>
</div>
