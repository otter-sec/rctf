<script lang="ts">
  import { Tooltip } from '$lib/components'
  import { IconCircleCheckFilled, IconCircleDashed } from '$lib/icons'
  import { getCategoryStyle } from '$lib/utils/categories'
  import type { CategoryGroup, ChallengeInfo, SortMode, TooltipData, ViewMode } from './types'

  interface Props {
    teamId: string
    viewMode: ViewMode
    sortMode: SortMode
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
    categoryGroups,
    challenges,
    getSolves,
    getSolveTime,
    getCategoryStats,
    getBloodIndex,
    onCellHover,
  }: Props = $props()

  const CELL_WIDTH = 48
  const CELL_HEIGHT = 64
  const CELL_GAP = 4
  const ICON_RADIUS = 10

  const svgContent = $derived.by(() => {
    const list = sortMode === 'categories' ? categoryGroups.flatMap(g => g.challenges) : challenges

    const parts: string[] = []
    let x = 0

    for (const challenge of list) {
      const solved = getSolves(challenge.id)
      const bloodIndex = getBloodIndex(challenge.id)
      const cx = x + CELL_WIDTH / 2
      const cy = CELL_HEIGHT / 2

      // We are inlining svgs, because somehow it will be more optimized for firefox than using a component.
      // Do not ask me why.
      if (bloodIndex === 0) {
        parts.push(
          `<circle cx="${cx}" cy="${cy}" r="${ICON_RADIUS}" fill="var(--foreground-gold-l0)"/>`
        )
        parts.push(
          `<text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="white" font-size="12" font-weight="bold">1</text>`
        )
      } else if (bloodIndex === 1) {
        parts.push(
          `<circle cx="${cx}" cy="${cy}" r="${ICON_RADIUS}" fill="var(--foreground-silver-l0)"/>`
        )
        parts.push(
          `<text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="white" font-size="12" font-weight="bold">2</text>`
        )
      } else if (bloodIndex === 2) {
        parts.push(
          `<circle cx="${cx}" cy="${cy}" r="${ICON_RADIUS}" fill="var(--foreground-bronze-l0)"/>`
        )
        parts.push(
          `<text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="white" font-size="12" font-weight="bold">3</text>`
        )
      } else if (solved) {
        parts.push(
          `<circle cx="${cx}" cy="${cy}" r="${ICON_RADIUS}" fill="none" stroke="var(--foreground-success)" stroke-opacity="0.75" stroke-width="2"/>`
        )
      } else {
        parts.push(
          `<circle cx="${cx}" cy="${cy}" r="${ICON_RADIUS}" fill="none" stroke="var(--foreground-l5)" stroke-opacity="0.25" stroke-width="2" stroke-dasharray="4 3"/>`
        )
      }

      x += CELL_WIDTH + CELL_GAP
    }

    return {
      width: list.length * (CELL_WIDTH + CELL_GAP),
      html: parts.join(''),
    }
  })

  const challengeList = $derived(
    sortMode === 'categories' ? categoryGroups.flatMap(g => g.challenges) : challenges
  )

  function handleMouseMove(e: MouseEvent) {
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const cellIndex = Math.floor(x / (CELL_WIDTH + CELL_GAP))

    const challenge = challengeList[cellIndex]
    if (!challenge) {
      onCellHover(null, 0, 0)
      return
    }

    const cellX = rect.left + cellIndex * (CELL_WIDTH + CELL_GAP) + CELL_WIDTH / 2
    const cellY = rect.top + CELL_HEIGHT / 2 - ICON_RADIUS
    onCellHover(
      {
        teamId,
        challengeName: challenge.name,
        points: challenge.points,
        solved: getSolves(challenge.id),
        bloodIndex: getBloodIndex(challenge.id),
        solveTime: getSolveTime(challenge.id),
      },
      cellX,
      cellY
    )
  }

  function handleMouseLeave() {
    onCellHover(null, 0, 0)
  }
</script>

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

<div
  class="perf-scroll-optimized bg-background-l2 flex gap-1 rounded-r-md pr-(--diagonal-overflow) pl-1"
>
  {#if viewMode === 'categories'}
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
  {:else}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <svg
      width={svgContent.width}
      height={CELL_HEIGHT}
      viewBox="0 0 {svgContent.width} {CELL_HEIGHT}"
      class="rounded-l-lg"
      onmousemove={handleMouseMove}
      onmouseleave={handleMouseLeave}
    >
      {@html svgContent.html}
    </svg>
  {/if}
</div>
