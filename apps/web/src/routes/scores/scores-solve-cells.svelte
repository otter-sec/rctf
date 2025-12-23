<script lang="ts" module>
  const svgCache = new Map<string, { width: number; html: string }>()
  const categoryCache = new Map<string, string>()
  let lastChallengeCount = 0
  let lastCategoryCount = 0

  function invalidateCachesIfNeeded(challengeCount: number, categoryCount: number) {
    if (challengeCount !== lastChallengeCount) {
      svgCache.clear()
      lastChallengeCount = challengeCount
    }
    if (categoryCount !== lastCategoryCount) {
      categoryCache.clear()
      lastCategoryCount = categoryCount
    }
  }
</script>

<script lang="ts">
  import { cn } from '$lib/utils'
  import { getCategoryStyle } from '$lib/utils/categories'
  import type { CategoryGroup, ChallengeInfo, SortMode, TooltipData, ViewMode } from './types'

  // Inlined for performance (avoids component instantiation overhead)
  const ICON_CHECK_FILLED = `<path fill="currentColor" d="M17 3.34a10 10 0 1 1-14.995 8.984L2 12l.005-.324A10 10 0 0 1 17 3.34m-1.293 5.953a1 1 0 0 0-1.32-.083l-.094.083L11 12.585l-1.293-1.292l-.094-.083a1 1 0 0 0-1.403 1.403l.083.094l2 2l.094.083a1 1 0 0 0 1.226 0l.094-.083l4-4l.083-.094a1 1 0 0 0-.083-1.32"/>`
  const ICON_CIRCLE_DASHED = `<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.56 3.69a9 9 0 0 0-2.92 1.95M3.69 8.56A9 9 0 0 0 3 12m.69 3.44a9 9 0 0 0 1.95 2.92m2.92 1.95A9 9 0 0 0 12 21m3.44-.69a9 9 0 0 0 2.92-1.95m1.95-2.92A9 9 0 0 0 21 12m-.69-3.44a9 9 0 0 0-1.95-2.92m-2.92-1.95A9 9 0 0 0 12 3"/>`

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
    isScrolling?: boolean
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
    isScrolling = false,
  }: Props = $props()

  const CELL_WIDTH = 48
  const CELL_HEIGHT = 64
  const CELL_GAP = 4
  const ICON_RADIUS = 10

  const CAT_CELL_SIZE = 48

  const totalChallengeCount = $derived(
    sortMode === 'categories'
      ? categoryGroups.reduce((n, g) => n + g.challenges.length, 0)
      : challenges.length
  )
  const svgWidth = $derived(totalChallengeCount * (CELL_WIDTH + CELL_GAP))

  const challengeSvgContent = $derived.by(() => {
    invalidateCachesIfNeeded(totalChallengeCount, categoryGroups.length)

    const cached = svgCache.get(teamId)
    if (cached) {
      return cached
    }

    const list = sortMode === 'categories' ? categoryGroups.flatMap(g => g.challenges) : challenges
    const width = svgWidth

    const parts: string[] = []
    let x = 0

    for (const challenge of list) {
      const solved = getSolves(challenge.id)
      const bloodIndex = getBloodIndex(challenge.id)
      const cx = x + CELL_WIDTH / 2
      const cy = CELL_HEIGHT / 2

      if (bloodIndex === 0) {
        parts.push(
          `<circle cx="${cx}" cy="${cy}" r="${ICON_RADIUS}" fill="var(--foreground-gold-l0)"/>`
        )
        parts.push(
          `<text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="var(--background-l0)" font-family="var(--font-mono)" font-size="12" font-weight="bold">1</text>`
        )
      } else if (bloodIndex === 1) {
        parts.push(
          `<circle cx="${cx}" cy="${cy}" r="${ICON_RADIUS}" fill="var(--foreground-silver-l0)"/>`
        )
        parts.push(
          `<text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="var(--background-l0)" font-family="var(--font-mono)" font-size="12" font-weight="bold">2</text>`
        )
      } else if (bloodIndex === 2) {
        parts.push(
          `<circle cx="${cx}" cy="${cy}" r="${ICON_RADIUS}" fill="var(--foreground-bronze-l0)"/>`
        )
        parts.push(
          `<text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="var(--background-l0)" font-size="12" font-weight="bold">3</text>`
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

    const result = { width, html: parts.join('') }
    svgCache.set(teamId, result)
    return result
  })

  const categoryHtmlContent = $derived.by(() => {
    invalidateCachesIfNeeded(totalChallengeCount, categoryGroups.length)

    const cached = categoryCache.get(teamId)
    if (cached !== undefined) {
      return cached
    }

    const parts: string[] = []

    for (const group of categoryGroups) {
      const stats = getCategoryStats(group)
      const style = getCategoryStyle(group.config.color)

      let iconSvg: string
      if (stats.solved === stats.total) {
        iconSvg = `<svg class="size-7" style="color: var(--category-foreground-l1)" viewBox="0 0 24 24">${ICON_CHECK_FILLED}</svg>`
      } else if (stats.solved > 0) {
        const circumference = 2 * Math.PI * 10
        const offset = circumference * (1 - stats.percent / 100)
        iconSvg = `<svg class="size-7 -rotate-90" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="var(--foreground-l5)" stroke-opacity="0.2" stroke-width="2.5"/><circle cx="12" cy="12" r="10" fill="none" stroke="var(--category-foreground-l1)" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/></svg>`
      } else {
        iconSvg = `<svg class="size-7" style="color: var(--foreground-l5); opacity: 0.25" viewBox="0 0 24 24">${ICON_CIRCLE_DASHED}</svg>`
      }

      parts.push(
        `<div class="flex h-12 w-12 items-center justify-center rounded-l-lg md:h-16" style="${style}">${iconSvg}</div>`
      )
    }

    const result = parts.join('')
    categoryCache.set(teamId, result)
    return result
  })

  const challengeList = $derived(
    sortMode === 'categories' ? categoryGroups.flatMap(g => g.challenges) : challenges
  )

  function handleChallengeMouseMove(e: MouseEvent) {
    if (isScrolling) return
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
        type: 'challenge',
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

  function handleCategoryMouseMove(e: MouseEvent) {
    if (isScrolling) return

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const cellIndex = Math.floor(x / (CAT_CELL_SIZE + CELL_GAP))

    const group = categoryGroups[cellIndex]
    if (!group) {
      onCellHover(null, 0, 0)
      return
    }

    const stats = getCategoryStats(group)
    const cellX = rect.left + cellIndex * (CAT_CELL_SIZE + CELL_GAP) + CAT_CELL_SIZE / 2
    const cellY = rect.top
    onCellHover(
      {
        type: 'category',
        teamId,
        categoryName: group.config.name,
        solved: stats.solved,
        total: stats.total,
      },
      cellX,
      cellY
    )
  }

  function handleMouseLeave() {
    if (isScrolling) return
    onCellHover(null, 0, 0)
  }
</script>

<div
  class={cn(
    'bg-background-l2 flex transform-[translateZ(0)] gap-1 rounded-r-md pr-(--diagonal-overflow) pl-1 will-change-transform contain-[layout_style_paint]',
    isScrolling && 'pointer-events-none'
  )}
>
  {#if viewMode === 'categories'}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="flex gap-1" onmousemove={handleCategoryMouseMove} onmouseleave={handleMouseLeave}>
      {@html categoryHtmlContent}
    </div>
  {:else}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <svg
      width={challengeSvgContent.width}
      height={CELL_HEIGHT}
      viewBox="0 0 {challengeSvgContent.width} {CELL_HEIGHT}"
      class="rounded-l-lg"
      onmousemove={handleChallengeMouseMove}
      onmouseleave={handleMouseLeave}
    >
      {@html challengeSvgContent.html}
    </svg>
  {/if}
</div>
