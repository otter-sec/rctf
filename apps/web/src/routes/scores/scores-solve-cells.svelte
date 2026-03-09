<script lang="ts" module>
  import type { SortMode } from './types'

  const svgCache = new Map<string, { width: number; html: string }>()
  const categoryCache = new Map<string, string>()
  let lastChallengeCount = 0
  let lastCategoryCount = 0
  let lastSortMode: SortMode = 'categories'

  function invalidateCachesIfNeeded(
    challengeCount: number,
    categoryCount: number,
    sortMode: SortMode
  ) {
    if (challengeCount !== lastChallengeCount || sortMode !== lastSortMode) {
      svgCache.clear()
      lastChallengeCount = challengeCount
      lastSortMode = sortMode
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
  import type { CategoryGroup, ChallengeInfo, TooltipData, ViewMode } from './types'

  // We inline these SVGs for performance to avoid component instantiation overhead
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
    isCurrentUser?: boolean
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
    isCurrentUser = false,
  }: Props = $props()

  const CELL_WIDTH = 48
  const CELL_HEIGHT = 64
  const CELL_GAP = 4
  const ICON_RADIUS = 10
  // 20 * (x / 24) = 22 => x = 22 * 24 / 20 = 26.4
  const BLOOD_ICON_SIZE = 26.4
  const CAT_CELL_SIZE = 48

  const totalChallengeCount = $derived(
    sortMode === 'categories'
      ? categoryGroups.reduce((n, g) => n + g.challenges.length, 0)
      : challenges.length
  )
  const svgWidth = $derived(totalChallengeCount * (CELL_WIDTH + CELL_GAP))

  const challengeSvgContent = $derived.by(() => {
    invalidateCachesIfNeeded(totalChallengeCount, categoryGroups.length, sortMode)

    const cached = svgCache.get(teamId)
    if (cached) {
      return cached
    }

    const list = sortMode === 'categories' ? categoryGroups.flatMap(g => g.challenges) : challenges
    const width = svgWidth

    const parts: string[] = []
    let x = 0

    if (sortMode === 'categories') {
      let bgX = 0
      for (let gi = 0; gi < categoryGroups.length; gi++) {
        const group = categoryGroups[gi]!
        const groupWidth = group.challenges.length * (CELL_WIDTH + CELL_GAP)
        if (gi % 2 === 0) {
          parts.push(
            `<rect x="${bgX}" y="0" width="${groupWidth - CELL_GAP}" height="${CELL_HEIGHT}" fill="var(--foreground-l0)" opacity="0.03"/>`
          )
        }
        bgX += groupWidth
      }
    } else {
      for (let i = 0; i < list.length; i++) {
        if (i % 2 === 0) {
          const colX = i * (CELL_WIDTH + CELL_GAP)
          parts.push(
            `<rect x="${colX}" y="0" width="${CELL_WIDTH}" height="${CELL_HEIGHT}" fill="var(--foreground-l0)" opacity="0.03"/>`
          )
        }
      }
    }

    for (const challenge of list) {
      const solved = getSolves(challenge.id)
      const bloodIndex = getBloodIndex(challenge.id)
      const cx = x + CELL_WIDTH / 2
      const cy = CELL_HEIGHT / 2

      if (bloodIndex === 0) {
        parts.push(
          `<svg x="${cx - BLOOD_ICON_SIZE / 2}" y="${cy - BLOOD_ICON_SIZE / 2}" width="${BLOOD_ICON_SIZE}" height="${BLOOD_ICON_SIZE}" viewBox="0 0 24 24"><path fill="var(--foreground-gold-l0)" d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2m.994 5.886c-.083-.777-1.008-1.16-1.617-.67l-.084.077l-2 2l-.083.094a1 1 0 0 0 0 1.226l.083.094l.094.083a1 1 0 0 0 1.226 0l.094-.083l.293-.293V16l.007.117a1 1 0 0 0 1.986 0L13 16V8z"/></svg>`
        )
      } else if (bloodIndex === 1) {
        parts.push(
          `<svg x="${cx - BLOOD_ICON_SIZE / 2}" y="${cy - BLOOD_ICON_SIZE / 2}" width="${BLOOD_ICON_SIZE}" height="${BLOOD_ICON_SIZE}" viewBox="0 0 24 24"><path fill="var(--foreground-silver-l0)" d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2m1 5h-3l-.117.007a1 1 0 0 0 0 1.986L10 9h3v2h-2l-.15.005a2 2 0 0 0-1.844 1.838L9 13v2l.005.15a2 2 0 0 0 1.838 1.844L11 17h3l.117-.007a1 1 0 0 0 0-1.986L14 15h-3v-2h2l.15-.005a2 2 0 0 0 1.844-1.838L15 11V9l-.005-.15a2 2 0 0 0-1.838-1.844z"/></svg>`
        )
      } else if (bloodIndex === 2) {
        parts.push(
          `<svg x="${cx - BLOOD_ICON_SIZE / 2}" y="${cy - BLOOD_ICON_SIZE / 2}" width="${BLOOD_ICON_SIZE}" height="${BLOOD_ICON_SIZE}" viewBox="0 0 24 24"><path fill="var(--foreground-bronze-l0)" d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2m1 5h-2l-.15.005A2 2 0 0 0 9 9a1 1 0 0 0 1.974.23l.02-.113L11 9h2v2h-2l-.133.007c-1.111.12-1.154 1.73-.128 1.965l.128.021L11 13h2v2h-2l-.007-.117A1 1 0 0 0 9 15a2 2 0 0 0 1.85 1.995L11 17h2l.15-.005a2 2 0 0 0 1.844-1.838L15 15v-2l-.005-.15a2 2 0 0 0-.17-.667l-.075-.152l-.019-.032l.02-.03a2 2 0 0 0 .242-.795L15 11V9l-.005-.15a2 2 0 0 0-1.838-1.844z"/></svg>`
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
    invalidateCachesIfNeeded(totalChallengeCount, categoryGroups.length, sortMode)

    const cached = categoryCache.get(teamId)
    if (cached !== undefined) {
      return cached
    }

    const parts: string[] = []

    for (let gi = 0; gi < categoryGroups.length; gi++) {
      const group = categoryGroups[gi]!
      const stats = getCategoryStats(group)
      const style = getCategoryStyle(group.config.color)
      const shade = gi % 2 === 0 ? 'background: color-mix(in srgb, var(--foreground-l0) 3%, transparent);' : ''

      let iconSvg: string
      if (stats.solved === stats.total) {
        iconSvg = `<svg class="size-7" style="color: var(--category-foreground-l1)" viewBox="0 0 24 24">${ICON_CHECK_FILLED}</svg>`
      } else if (stats.solved > 0) {
        // Use r=8.75 so outer edge (8.75 + 1.25 stroke) = 10
        const radius = 8.75
        const circumference = 2 * Math.PI * radius
        const offset = circumference * (1 - stats.percent / 100)
        iconSvg = `<svg class="size-7 -rotate-90" viewBox="0 0 24 24"><circle cx="12" cy="12" r="${radius}" fill="none" stroke="var(--foreground-l5)" stroke-opacity="0.2" stroke-width="2.5"/><circle cx="12" cy="12" r="${radius}" fill="none" stroke="var(--category-foreground-l1)" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/></svg>`
      } else {
        iconSvg = `<svg class="size-7" style="color: var(--foreground-l5); opacity: 0.25" viewBox="0 0 24 24">${ICON_CIRCLE_DASHED}</svg>`
      }

      parts.push(
        `<div class="flex h-12 w-12 items-center justify-center rounded-l-lg md:h-16" style="${style}${shade}">${iconSvg}</div>`
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
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const cellIndex = Math.floor(mouseX / (CELL_WIDTH + CELL_GAP))
    const challenge = challengeList[cellIndex]
    if (!challenge) {
      onCellHover(null, 0, 0)
      return
    }

    const circleCenterX = cellIndex * (CELL_WIDTH + CELL_GAP) + CELL_WIDTH / 2
    const circleCenterY = CELL_HEIGHT / 2
    const dx = mouseX - circleCenterX
    const dy = mouseY - circleCenterY
    const distanceSquared = dx * dx + dy * dy

    if (distanceSquared > ICON_RADIUS * ICON_RADIUS) {
      onCellHover(null, 0, 0)
      return
    }

    const cellX = rect.left + circleCenterX
    const cellY = rect.top + circleCenterY - ICON_RADIUS
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
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const cellIndex = Math.floor(mouseX / (CAT_CELL_SIZE + CELL_GAP))

    const group = categoryGroups[cellIndex]
    if (!group) {
      onCellHover(null, 0, 0)
      return
    }

    const CAT_ICON_RADIUS = 14
    const circleCenterX = cellIndex * (CAT_CELL_SIZE + CELL_GAP) + CAT_CELL_SIZE / 2
    const circleCenterY = CELL_HEIGHT / 2
    const dx = mouseX - circleCenterX
    const dy = mouseY - circleCenterY
    const distanceSquared = dx * dx + dy * dy

    if (distanceSquared > CAT_ICON_RADIUS * CAT_ICON_RADIUS) {
      onCellHover(null, 0, 0)
      return
    }

    const stats = getCategoryStats(group)
    const cellX = rect.left + circleCenterX
    const cellY = rect.top + circleCenterY - CAT_ICON_RADIUS
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
    isScrolling && 'pointer-events-none',
    isCurrentUser && 'bg-background-self-l0'
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
      onmousemove={handleChallengeMouseMove}
      onmouseleave={handleMouseLeave}
    >
      {@html challengeSvgContent.html}
    </svg>
  {/if}
</div>
