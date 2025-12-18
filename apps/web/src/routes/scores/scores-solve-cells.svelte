<script lang="ts">
  import { Tooltip } from '$lib/components'
  import {
    IconCircle,
    IconCircleCheckFilled,
    IconCircleDashed,
    IconCircleNumber1Filled,
    IconCircleNumber2Filled,
    IconCircleNumber3Filled,
  } from '$lib/icons'
  import { cn } from '$lib/utils'
  import { getCategoryStyle } from '$lib/utils/categories'
  import type { CategoryGroup, ChallengeInfo, SortMode, TooltipData, ViewMode } from './types'

  interface Props {
    teamId: string
    viewMode: ViewMode
    sortMode: SortMode
    isScrolling?: boolean
    categoryGroups: CategoryGroup[]
    challenges: ChallengeInfo[]
    getSolves: (challengeId: string) => boolean
    getSolveTime: (challengeId: string) => number | undefined
    getCategoryStats: (group: CategoryGroup) => { solved: number; total: number; percent: number }
    getBloodIndex: (challengeId: string) => number
    onCellHover: (data: TooltipData | null, x: number, y: number) => void
  }

  let {
    teamId,
    viewMode,
    sortMode,
    isScrolling = false,
    categoryGroups,
    challenges,
    getSolves,
    getSolveTime,
    getCategoryStats,
    getBloodIndex,
    onCellHover,
  }: Props = $props()

  function showCellTooltip(
    e: MouseEvent,
    challenge: ChallengeInfo,
    solved: boolean,
    bloodIndex: number,
    solveTime?: number
  ) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    onCellHover(
      {
        teamId,
        challengeName: challenge.name,
        points: challenge.points,
        solved,
        bloodIndex,
        solveTime,
      },
      rect.left + rect.width / 2,
      rect.top
    )
  }
</script>

{#snippet solveCell(solved: boolean, bloodIndex: number)}
  {#if bloodIndex === 0}
    <IconCircleNumber1Filled class="text-foreground-gold-l0 size-7" />
  {:else if bloodIndex === 1}
    <IconCircleNumber2Filled class="text-foreground-silver-l0 size-7" />
  {:else if bloodIndex === 2}
    <IconCircleNumber3Filled class="text-foreground-bronze-l0 size-7" />
  {:else if solved}
    <IconCircle class="text-foreground-success/75 size-7" />
  {:else}
    <IconCircleDashed class="text-foreground-l5/25 size-7" />
  {/if}
{/snippet}

{#snippet categoryCell(stats: { solved: number; total: number; percent: number })}
  {#if stats.solved === stats.total}
    <IconCircleCheckFilled class="text-category-foreground-l1 size-7" />
  {:else if stats.solved > 0}
    <svg class="size-7 -rotate-90" viewBox="0 0 24 24">
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        class="text-foreground-l5/20"
      />
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-dasharray={2 * Math.PI * 10}
        stroke-dashoffset={2 * Math.PI * 10 * (1 - stats.percent / 100)}
        class="text-category-foreground-l1"
      />
    </svg>
  {:else}
    <IconCircleDashed class="text-foreground-l5/25 size-7" />
  {/if}
{/snippet}

<div class="bg-background-l2 mr-(--diagonal-overflow) flex gap-1 rounded-r-md pr-4 pl-1">
  {#if isScrolling}
    {#if viewMode === 'categories'}
      {#each categoryGroups as group}
        <div
          class="flex h-12 w-12 items-center justify-center rounded-l-lg opacity-70 md:h-16"
          style={getCategoryStyle(group.config.color)}
          aria-hidden="true"
        >
          <div class="bg-category-foreground-l1/35 size-2.5 rounded-full"></div>
        </div>
      {/each}
    {:else if sortMode === 'categories'}
      {#each categoryGroups as group}
        <div class="flex gap-1">
          {#each group.challenges as challenge, ci}
            <div
              class={cn(
                'flex h-16 w-12 items-center justify-center opacity-60',
                ci === 0 && 'rounded-l-lg'
              )}
              style={getCategoryStyle(challenge.config.color)}
              aria-hidden="true"
            >
              <div class="bg-category-foreground-l1/25 size-2.5 rounded-full"></div>
            </div>
          {/each}
        </div>
      {/each}
    {:else}
      {#each challenges as challenge, i}
        <div
          class={cn(
            'flex h-16 w-12 items-center justify-center opacity-60',
            i === 0 && 'rounded-l-lg'
          )}
          style={getCategoryStyle(challenge.config.color)}
          aria-hidden="true"
        >
          <div class="bg-category-foreground-l1/25 size-2.5 rounded-full"></div>
        </div>
      {/each}
    {/if}
  {:else if viewMode === 'categories'}
    {#each categoryGroups as group}
      {@const stats = getCategoryStats(group)}
      <div
        class="flex h-12 w-12 items-center justify-center rounded-l-lg md:h-16"
        style={getCategoryStyle(group.config.color)}
      >
        <Tooltip.Root>
          <Tooltip.Trigger class="flex items-center justify-center">
            {@render categoryCell(stats)}
          </Tooltip.Trigger>
          <Tooltip.Content side="top" sideOffset={4}>
            <p class="capitalize">{group.config.name}</p>
            <p class="text-foreground-l3">{stats.solved} / {stats.total} solved</p>
          </Tooltip.Content>
        </Tooltip.Root>
      </div>
    {/each}
  {:else if sortMode === 'categories'}
    {#each categoryGroups as group}
      <div class="flex gap-1">
        {#each group.challenges as challenge, ci}
          {@const solved = getSolves(challenge.id)}
          {@const bloodIndex = getBloodIndex(challenge.id)}
          {@const solveTime = getSolveTime(challenge.id)}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class={cn('flex h-16 w-12 items-center justify-center', ci === 0 && 'rounded-l-lg')}
            style={getCategoryStyle(challenge.config.color)}
            onmouseenter={e => showCellTooltip(e, challenge, solved, bloodIndex, solveTime)}
            onmouseleave={() => onCellHover(null, 0, 0)}
          >
            {@render solveCell(solved, bloodIndex)}
          </div>
        {/each}
      </div>
    {/each}
  {:else}
    {#each challenges as challenge, i}
      {@const solved = getSolves(challenge.id)}
      {@const bloodIndex = getBloodIndex(challenge.id)}
      {@const solveTime = getSolveTime(challenge.id)}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class={cn('flex h-16 w-12 items-center justify-center', i === 0 && 'rounded-l-lg')}
        style={getCategoryStyle(challenge.config.color)}
        onmouseenter={e => showCellTooltip(e, challenge, solved, bloodIndex, solveTime)}
        onmouseleave={() => onCellHover(null, 0, 0)}
      >
        {@render solveCell(solved, bloodIndex)}
      </div>
    {/each}
  {/if}
</div>
