<script lang="ts">
  import type { UserProfile } from '@rctf/types'
  import { Tooltip } from '$lib/components'
  import { IconCircleCheckFilled, IconCircleDashed } from '$lib/icons'
  import { cn } from '$lib/utils'
  import { getCategoryStyle } from '$lib/utils/categories'
  import Cell from './scores-cell-blood.svelte'
  import Progress from './scores-cell-progress.svelte'
  import TeamInfo from './scores-row-team-info.svelte'
  import type { CategoryGroup, Challenge, SortMode, TooltipData, ViewMode } from './types'

  interface Props {
    user: UserProfile
    rank: number
    challenges: Challenge[]
    categoryGroups: CategoryGroup[]
    solves: Map<string, { id: string; solveTime: number }>
    teamColWidth: number
    sortMode: SortMode
    viewMode: ViewMode
    sparklineData?: { time: number; score: number }[]
    page?: number
    onHover?: () => void
    onUnhover?: () => void
    onCellHover?: (data: TooltipData | null, x: number, y: number) => void
  }

  let {
    user,
    rank,
    challenges,
    categoryGroups,
    solves,
    teamColWidth,
    sortMode,
    viewMode,
    sparklineData = [],
    page = 1,
    onHover,
    onUnhover,
    onCellHover,
  }: Props = $props()

  const isBoomer = $derived(viewMode === 'boomer')
  const isMinimal = $derived(viewMode === 'minimal')

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
  {@const bloodIndex = challenge.firstSolvers?.findIndex(s => s.id === user.id) ?? -1}
  <div
    class={cn('flex h-16 w-12 items-center justify-center', isFirst && 'rounded-l-lg')}
    style={getCategoryStyle(challenge.config.color)}
  >
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="flex items-center justify-center"
      onmouseenter={e =>
        showTooltip(e, {
          teamId: user.id,
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
          <IconCircleCheckFilled class="text-category-foreground-l1 size-7" />
        {:else if stat.status === 'partial'}
          <Progress percent={stat.percent} class="text-foreground-l4 size-7" />
        {:else}
          <IconCircleDashed class="text-foreground-l5/25 size-7" />
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
<div class="group bg-background-l2/50 hover:bg-background-l2 w-full rounded-lg">
  <div
    class={cn(
      'bg-background-l2 group-hover:bg-background-l3 flex rounded-lg',
      isMinimal ? 'w-full' : 'w-fit'
    )}
  >
    <TeamInfo
      id={user.id}
      name={user.name}
      score={user.score}
      solveCount={user.solves.length}
      avatarUrl={user.avatarUrl}
      division={user.division}
      divisionPlace={user.divisionPlace ?? 0}
      {rank}
      isCurrentUser={true}
      width={isMinimal ? undefined : teamColWidth}
      {sparklineData}
      {page}
      {onHover}
      {onUnhover}
    />

    {#if !isMinimal}
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
    {/if}
  </div>
</div>
