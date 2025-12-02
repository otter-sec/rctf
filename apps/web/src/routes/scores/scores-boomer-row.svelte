<script lang="ts">
  import { Avatar, Tooltip } from '$lib/components'
  import { IconCircleCheckFilled, IconCircleDashed } from '$lib/icons'
  import { cn, getInitials, getRankStylesForPosition } from '$lib/utils'
  import { getCategoryStyle } from '$lib/utils/categories'
  import ProgressPie from './progress-pie.svelte'
  import type { CategoryGroup, LeaderboardEntry } from './types'

  interface Props {
    entry: LeaderboardEntry
    rank: number
    categoryGroups: CategoryGroup[]
    solves: Map<string, { id: string; solveTime: number }>
    isCurrentUser: boolean
    teamColWidth: number
    onHover?: () => void
  }

  let {
    entry,
    rank,
    categoryGroups,
    solves,
    isCurrentUser,
    teamColWidth,
    onHover,
  }: Props = $props()

  const styles = $derived(getRankStylesForPosition(rank, isCurrentUser))

  const categorySolveStatus = $derived(
    categoryGroups.map(group => {
      const totalChallenges = group.challenges.length
      const solvedCount = group.challenges.filter(c => solves.has(c.id)).length
      const percent = (solvedCount / totalChallenges) * 100
      return {
        category: group.category,
        config: group.config,
        totalChallenges,
        solvedCount,
        percent,
        isComplete: solvedCount === totalChallenges,
        isPartial: solvedCount > 0 && solvedCount < totalChallenges,
        isNotStarted: solvedCount === 0,
      }
    })
  )
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
    <span
      class={cn('w-16 shrink-0 text-center text-xl tabular-nums', styles.fgL0)}
    >
      #{rank}
    </span>

    <Avatar.Root class="size-12 shrink-0 rounded-lg">
      {#if entry.avatarUrl}
        <Avatar.Image
          src={entry.avatarUrl}
          alt={entry.name}
          class="rounded-lg"
        />
      {/if}
      <Avatar.Fallback class="rounded-lg text-sm">
        {getInitials(entry.name)}
      </Avatar.Fallback>
    </Avatar.Root>

    <div class="flex h-full w-64 shrink-0 flex-col justify-center">
      <a
        href="/profile/{entry.id}"
        class={cn('truncate text-xl hover:underline', styles.fgL0)}
      >
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

  <div class="flex pr-4">
    {#each categorySolveStatus as status, i}
      <div
        class={cn(
          'flex h-16 w-12 items-center justify-center rounded-l-lg',
          i < categorySolveStatus.length - 1 && 'mr-1'
        )}
        style={getCategoryStyle(status.config.color)}
      >
        <Tooltip.Root>
          <Tooltip.Trigger class="flex items-center justify-center">
            {#if status.isComplete}
              <IconCircleCheckFilled
                class="size-7 text-category-foreground-l1"
              />
            {:else if status.isPartial}
              <ProgressPie
                percent={status.percent}
                class="size-7 text-foreground-l4"
              />
            {:else}
              <IconCircleDashed class="size-7 text-foreground-l5/25" />
            {/if}
          </Tooltip.Trigger>
          <Tooltip.Content side="top" sideOffset={4}>
            <p class="capitalize">{status.config.name}</p>
            <p class="text-foreground-l3">
              {status.solvedCount} / {status.totalChallenges} solved
            </p>
          </Tooltip.Content>
        </Tooltip.Root>
      </div>
    {/each}
  </div>
</div>
