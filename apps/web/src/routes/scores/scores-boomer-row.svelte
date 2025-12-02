<script lang="ts">
  import { Tooltip } from '$lib/components'
  import { IconCircleCheckFilled, IconCircleDashed } from '$lib/icons'
  import { cn } from '$lib/utils'
  import { getCategoryStyle } from '$lib/utils/categories'
  import Progress from './scores-boomer-progress.svelte'
  import TeamInfo from './scores-team-info.svelte'
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
    {#each categoryStats as stat, i}
      <div
        class={cn(
          'flex h-16 w-12 items-center justify-center rounded-l-lg',
          i < categoryStats.length - 1 && 'mr-1'
        )}
        style={getCategoryStyle(stat.config.color)}
      >
        <Tooltip.Root>
          <Tooltip.Trigger class="flex items-center justify-center">
            {#if stat.status === 'complete'}
              <IconCircleCheckFilled
                class="size-7 text-category-foreground-l1"
              />
            {:else if stat.status === 'partial'}
              <Progress percent={stat.percent} class="size-7 text-foreground-l4" />
            {:else}
              <IconCircleDashed class="size-7 text-foreground-l5/25" />
            {/if}
          </Tooltip.Trigger>
          <Tooltip.Content side="top" sideOffset={4}>
            <p class="capitalize">{stat.config.name}</p>
            <p class="text-foreground-l3">
              {stat.solved} / {stat.total} solved
            </p>
          </Tooltip.Content>
        </Tooltip.Root>
      </div>
    {/each}
  </div>
</div>
