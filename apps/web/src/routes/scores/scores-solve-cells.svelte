<script lang="ts" module>
  import { CELL_GAP, CELL_HEIGHT, CELL_WIDTH } from './scores-layout-constants'
  import type { CategoryGroup, ChallengeInfo, SortMode, TooltipData, ViewMode } from './types'

  interface RenderedStrip {
    svg: string
    width: number
  }

  interface CategoryPalette {
    foreground: string
  }

  interface RenderPalette {
    stripe: string
    solved: string
    unsolved: string
    gold: string
    silver: string
    bronze: string
    category: Map<string, CategoryPalette>
  }

  interface ChallengeStripOptions {
    sortMode: SortMode
    categoryGroups: CategoryGroup[]
    challenges: ChallengeInfo[]
    focusedChallengeId: string | null
    getSolves: (challengeId: string) => boolean
    getBloodIndex: (challengeId: string) => number
    palette: RenderPalette
  }

  interface CategoryStripOptions {
    categoryGroups: CategoryGroup[]
    getCategoryStats: (group: CategoryGroup) => { solved: number; total: number; percent: number }
    palette: RenderPalette
  }

  const ICON_RADIUS = 10
  const CAT_ICON_RADIUS = 14
  // 20 * (x / 24) = 22 => x = 22 * 24 / 20 = 26.4
  const BLOOD_ICON_SIZE = 26.4
  const CATEGORY_ICON_SIZE = 28
  const MAX_RENDER_CACHE_ENTRIES = 512

  // We inline these SVGs for performance to avoid component instantiation overhead
  const CHECK_PATH =
    'M17 3.34a10 10 0 1 1-14.995 8.984L2 12l.005-.324A10 10 0 0 1 17 3.34m-1.293 5.953a1 1 0 0 0-1.32-.083l-.094.083L11 12.585l-1.293-1.292l-.094-.083a1 1 0 0 0-1.403 1.403l.083.094l2 2l.094.083a1 1 0 0 0 1.226 0l.094-.083l4-4l.083-.094a1 1 0 0 0-.083-1.32'
  const DASHED_CIRCLE_PATH =
    'M8.56 3.69a9 9 0 0 0-2.92 1.95M3.69 8.56A9 9 0 0 0 3 12m.69 3.44a9 9 0 0 0 1.95 2.92m2.92 1.95A9 9 0 0 0 12 21m3.44-.69a9 9 0 0 0 2.92-1.95m1.95-2.92A9 9 0 0 0 21 12m-.69-3.44a9 9 0 0 0-1.95-2.92m-2.92-1.95A9 9 0 0 0 12 3'
  const BLOOD_PATHS = [
    'M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2m.994 5.886c-.083-.777-1.008-1.16-1.617-.67l-.084.077l-2 2l-.083.094a1 1 0 0 0 0 1.226l.083.094l.094.083a1 1 0 0 0 1.226 0l.094-.083l.293-.293V16l.007.117a1 1 0 0 0 1.986 0L13 16V8z',
    'M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2m1 5h-3l-.117.007a1 1 0 0 0 0 1.986L10 9h3v2h-2l-.15.005a2 2 0 0 0-1.844 1.838L9 13v2l.005.15a2 2 0 0 0 1.838 1.844L11 17h3l.117-.007a1 1 0 0 0 0-1.986L14 15h-3v-2h2l.15-.005a2 2 0 0 0 1.844-1.838L15 11V9l-.005-.15a2 2 0 0 0-1.838-1.844z',
    'M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2m1 5h-2l-.15.005A2 2 0 0 0 9 9a1 1 0 0 0 1.974.23l.02-.113L11 9h2v2h-2l-.133.007c-1.111.12-1.154 1.73-.128 1.965l.128.021L11 13h2v2h-2l-.007-.117A1 1 0 0 0 9 15a2 2 0 0 0 1.85 1.995L11 17h2l.15-.005a2 2 0 0 0 1.844-1.838L15 15v-2l-.005-.15a2 2 0 0 0-.17-.667l-.075-.152l-.019-.032l.02-.03a2 2 0 0 0 .242-.795L15 11V9l-.005-.15a2 2 0 0 0-1.838-1.844z',
  ] as const

  // consumer ref-counting ensures cleanup when the last instance unmounts
  const stripCache = new Map<string, RenderedStrip>()
  const resolvedColorCache = new Map<string, string>()
  let lastPaletteScope = ''
  let cachedPalette: RenderPalette | null = null
  let activeStripConsumers = 0

  function clearStripCache() {
    stripCache.clear()
  }

  function invalidatePaletteIfNeeded(scope: string) {
    if (scope === lastPaletteScope) return
    clearStripCache()
    resolvedColorCache.clear()
    cachedPalette = null
    lastPaletteScope = scope
  }

  function registerStripConsumer() {
    activeStripConsumers += 1
  }

  function unregisterStripConsumer() {
    activeStripConsumers = Math.max(0, activeStripConsumers - 1)
    if (activeStripConsumers === 0) {
      clearStripCache()
      resolvedColorCache.clear()
      cachedPalette = null
      lastPaletteScope = ''
    }
  }

  function getCachedStrip(key: string): RenderedStrip | undefined {
    const cached = stripCache.get(key)
    if (!cached) return undefined
    stripCache.delete(key)
    stripCache.set(key, cached)
    return cached
  }

  function cacheStrip(key: string, strip: RenderedStrip) {
    stripCache.delete(key)
    stripCache.set(key, strip)

    while (stripCache.size > MAX_RENDER_CACHE_ENTRIES) {
      const oldestKey = stripCache.keys().next().value
      if (oldestKey === undefined) break
      stripCache.delete(oldestKey)
    }
  }

  function readCssColor(name: string, fallback: string): string {
    const cached = resolvedColorCache.get(name)
    if (cached) return cached
    if (typeof document === 'undefined') return fallback

    const value =
      getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
    resolvedColorCache.set(name, value)
    return value
  }

  function getOrBuildPalette(categoryColors: string[]): RenderPalette {
    if (cachedPalette) return cachedPalette

    const category = new Map<string, CategoryPalette>()

    for (const color of new Set(categoryColors)) {
      category.set(color, {
        foreground: readCssColor(`--foreground-${color}-l1`, '#52525b'),
      })
    }

    cachedPalette = {
      stripe: readCssColor('--foreground-l0', '#3f3f46'),
      solved: readCssColor('--foreground-success', '#047857'),
      unsolved: readCssColor('--foreground-l5', '#a1a1aa'),
      gold: readCssColor('--foreground-gold-l0', '#ca8a04'),
      silver: readCssColor('--foreground-silver-l0', '#64748b'),
      bronze: readCssColor('--foreground-bronze-l0', '#92400e'),
      category,
    }
    return cachedPalette
  }

  function wrapSvg(width: number, content: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${CELL_HEIGHT}" viewBox="0 0 ${width} ${CELL_HEIGHT}" fill="none">${content}</svg>`
  }

  function buildChallengeStripSvg({
    sortMode,
    categoryGroups,
    challenges,
    focusedChallengeId,
    getSolves,
    getBloodIndex,
    palette,
  }: ChallengeStripOptions) {
    const list = sortMode === 'categories' ? categoryGroups.flatMap(g => g.challenges) : challenges
    const width = list.length * (CELL_WIDTH + CELL_GAP)
    const parts: string[] = []

    if (sortMode === 'categories') {
      let bgX = 0
      for (let gi = 0; gi < categoryGroups.length; gi++) {
        const group = categoryGroups[gi]!
        const groupWidth = group.challenges.length * (CELL_WIDTH + CELL_GAP)
        if (gi % 2 === 0) {
          parts.push(
            `<rect x="${bgX}" y="0" width="${groupWidth - CELL_GAP}" height="${CELL_HEIGHT}" fill="${palette.stripe}" opacity="0.03"/>`
          )
        }
        bgX += groupWidth
      }
    } else {
      for (let i = 0; i < list.length; i++) {
        if (i % 2 === 0) {
          const x = i * (CELL_WIDTH + CELL_GAP)
          parts.push(
            `<rect x="${x}" y="0" width="${CELL_WIDTH}" height="${CELL_HEIGHT}" fill="${palette.stripe}" opacity="0.03"/>`
          )
        }
      }
    }

    for (let i = 0; i < list.length; i++) {
      const challenge = list[i]!
      const x = i * (CELL_WIDTH + CELL_GAP)
      const cx = x + CELL_WIDTH / 2
      const cy = CELL_HEIGHT / 2
      const bloodIndex = getBloodIndex(challenge.id)
      const solved = getSolves(challenge.id)
      const isDimmed = focusedChallengeId !== null && focusedChallengeId !== challenge.id
      const open = isDimmed ? '<g opacity="0.25">' : ''
      const close = isDimmed ? '</g>' : ''

      if (bloodIndex >= 0 && bloodIndex < BLOOD_PATHS.length) {
        const color =
          bloodIndex === 0 ? palette.gold : bloodIndex === 1 ? palette.silver : palette.bronze
        parts.push(
          `${open}<svg x="${cx - BLOOD_ICON_SIZE / 2}" y="${cy - BLOOD_ICON_SIZE / 2}" width="${BLOOD_ICON_SIZE}" height="${BLOOD_ICON_SIZE}" viewBox="0 0 24 24"><path fill="${color}" d="${BLOOD_PATHS[bloodIndex]!}"/></svg>${close}`
        )
        continue
      }

      if (solved) {
        parts.push(
          `${open}<circle cx="${cx}" cy="${cy}" r="${ICON_RADIUS}" fill="none" stroke="${palette.solved}" stroke-opacity="0.75" stroke-width="2"/>${close}`
        )
        continue
      }

      parts.push(
        `${open}<circle cx="${cx}" cy="${cy}" r="${ICON_RADIUS}" fill="none" stroke="${palette.unsolved}" stroke-opacity="0.25" stroke-width="2" stroke-dasharray="4 3"/>${close}`
      )
    }

    return { width, svg: wrapSvg(width, parts.join('')) }
  }

  function buildCategoryStripSvg({
    categoryGroups,
    getCategoryStats,
    palette,
  }: CategoryStripOptions) {
    const width = categoryGroups.length * (CELL_WIDTH + CELL_GAP)
    const parts: string[] = []

    for (let i = 0; i < categoryGroups.length; i++) {
      const group = categoryGroups[i]!
      const x = i * (CELL_WIDTH + CELL_GAP)
      const stats = getCategoryStats(group)
      const colors = palette.category.get(group.config.color) ?? {
        foreground: '#52525b',
      }

      if (i % 2 === 0) {
        parts.push(
          `<rect x="${x}" y="0" width="${CELL_WIDTH}" height="${CELL_HEIGHT}" fill="${palette.stripe}" opacity="0.03"/>`
        )
      }

      const iconX = x + (CELL_WIDTH - CATEGORY_ICON_SIZE) / 2
      const iconY = (CELL_HEIGHT - CATEGORY_ICON_SIZE) / 2

      if (stats.solved === stats.total) {
        parts.push(
          `<svg x="${iconX}" y="${iconY}" width="${CATEGORY_ICON_SIZE}" height="${CATEGORY_ICON_SIZE}" viewBox="0 0 24 24"><path fill="${colors.foreground}" d="${CHECK_PATH}"/></svg>`
        )
        continue
      }

      if (stats.solved > 0) {
        const radius = 8.75
        const circumference = 2 * Math.PI * radius
        const offset = circumference * (1 - stats.percent / 100)

        parts.push(
          `<svg x="${iconX}" y="${iconY}" width="${CATEGORY_ICON_SIZE}" height="${CATEGORY_ICON_SIZE}" viewBox="0 0 24 24"><g transform="rotate(-90 12 12)"><circle cx="12" cy="12" r="${radius}" fill="none" stroke="${palette.unsolved}" stroke-opacity="0.2" stroke-width="2.5"/><circle cx="12" cy="12" r="${radius}" fill="none" stroke="${colors.foreground}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/></g></svg>`
        )
        continue
      }

      parts.push(
        `<svg x="${iconX}" y="${iconY}" width="${CATEGORY_ICON_SIZE}" height="${CATEGORY_ICON_SIZE}" viewBox="0 0 24 24"><path fill="none" stroke="${palette.unsolved}" stroke-opacity="0.25" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${DASHED_CIRCLE_PATH}"/></svg>`
      )
    }

    return { width, svg: wrapSvg(width, parts.join('')) }
  }
</script>

<script lang="ts">
  import { cn } from '$lib/utils'
  import { onDestroy } from 'svelte'

  interface Props {
    teamId: string
    viewMode: ViewMode
    sortMode: SortMode
    categoryGroups: CategoryGroup[]
    challenges: ChallengeInfo[]
    focusedChallengeId: string | null
    themeEpoch: number
    renderEpoch: number
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
    focusedChallengeId,
    themeEpoch,
    renderEpoch,
    getSolves,
    getSolveTime,
    getCategoryStats,
    getBloodIndex,
    onCellHover,
    isScrolling = false,
    isCurrentUser = false,
  }: Props = $props()

  let activeTooltipData = $state<TooltipData | null>(null)
  let activeTooltipKey = $state<string | null>(null)

  if (typeof document !== 'undefined') {
    registerStripConsumer()
    onDestroy(() => unregisterStripConsumer())
  }

  const imageWidth = $derived(
    (viewMode === 'categories' ? categoryGroups.length : challenges.length) *
      (CELL_WIDTH + CELL_GAP)
  )

  const challengeList = $derived(
    sortMode === 'categories' ? categoryGroups.flatMap(g => g.challenges) : challenges
  )

  const paletteScope = $derived.by(() => {
    const categoryColors = Array.from(new Set(categoryGroups.map(group => group.config.color)))
    return [themeEpoch, ...categoryColors].join(':')
  })

  const stripLayoutKey = $derived.by(() => {
    const categoryLayout = categoryGroups
      .map(group => {
        const challengeIds = group.challenges.map(challenge => challenge.id).join(',')
        return `${group.category}:${group.config.color}:${challengeIds}`
      })
      .join('|')

    if (viewMode === 'categories') {
      return `categories:${categoryLayout}`
    }

    if (sortMode === 'categories') {
      return `challenges:${focusedChallengeId ?? ''}:${categoryLayout}`
    }

    return `challenges:${focusedChallengeId ?? ''}:${challenges.map(challenge => challenge.id).join(',')}`
  })

  const stripDataKey = $derived.by(() => {
    // explicitly mark as dependency
    void renderEpoch

    if (viewMode === 'categories') {
      return categoryGroups
        .map(group => {
          const stats = getCategoryStats(group)
          return stats.solved.toString()
        })
        .join(',')
    }

    return challengeList
      .map(challenge => {
        const bloodIndex = getBloodIndex(challenge.id)
        if (bloodIndex >= 0 && bloodIndex < BLOOD_PATHS.length) {
          return `b${bloodIndex}`
        }
        return getSolves(challenge.id) ? 's' : 'u'
      })
      .join(',')
  })

  const strip = $derived.by(() => {
    if (typeof document === 'undefined') return null

    invalidatePaletteIfNeeded(paletteScope)

    const key = `${paletteScope}:${stripLayoutKey}:${teamId}:${stripDataKey}`
    const cached = getCachedStrip(key)
    if (cached) return cached

    const palette = getOrBuildPalette(categoryGroups.map(group => group.config.color))
    const rendered =
      viewMode === 'categories'
        ? buildCategoryStripSvg({
            categoryGroups,
            getCategoryStats,
            palette,
          })
        : buildChallengeStripSvg({
            sortMode,
            categoryGroups,
            challenges,
            focusedChallengeId,
            getSolves,
            getBloodIndex,
            palette,
          })

    const next: RenderedStrip = { svg: rendered.svg, width: rendered.width }
    cacheStrip(key, next)
    return next
  })

  function setCellHover(key: string, data: TooltipData, x: number, y: number) {
    if (activeTooltipKey === key) return
    activeTooltipKey = key
    activeTooltipData = data
    onCellHover(data, x, y)
  }

  function clearCellHover() {
    if (!activeTooltipKey && !activeTooltipData) return
    activeTooltipKey = null
    activeTooltipData = null
    onCellHover(null, 0, 0)
  }

  onDestroy(() => clearCellHover())

  $effect(() => {
    if (isScrolling && activeTooltipData) {
      clearCellHover()
    }
  })

  function handleChallengeMouseMove(e: MouseEvent) {
    if (isScrolling) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const cellIndex = Math.floor(mouseX / (CELL_WIDTH + CELL_GAP))
    const challenge = challengeList[cellIndex]
    if (!challenge) {
      clearCellHover()
      return
    }

    const circleCenterX = cellIndex * (CELL_WIDTH + CELL_GAP) + CELL_WIDTH / 2
    const circleCenterY = CELL_HEIGHT / 2
    const dx = mouseX - circleCenterX
    const dy = mouseY - circleCenterY

    if (dx * dx + dy * dy > ICON_RADIUS * ICON_RADIUS) {
      clearCellHover()
      return
    }

    const solved = getSolves(challenge.id)
    const bloodIndex = getBloodIndex(challenge.id)
    const solveTime = getSolveTime(challenge.id)
    setCellHover(
      `challenge:${teamId}:${challenge.id}:${solved ? 1 : 0}:${bloodIndex}:${solveTime ?? ''}`,
      {
        type: 'challenge',
        teamId,
        challengeName: challenge.name,
        points: challenge.points,
        solved,
        bloodIndex,
        solveTime,
      },
      rect.left + circleCenterX,
      rect.top + circleCenterY - ICON_RADIUS
    )
  }

  function handleCategoryMouseMove(e: MouseEvent) {
    if (isScrolling) return

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const cellIndex = Math.floor(mouseX / (CELL_WIDTH + CELL_GAP))
    const group = categoryGroups[cellIndex]
    if (!group) {
      clearCellHover()
      return
    }

    const circleCenterX = cellIndex * (CELL_WIDTH + CELL_GAP) + CELL_WIDTH / 2
    const circleCenterY = CELL_HEIGHT / 2
    const dx = mouseX - circleCenterX
    const dy = mouseY - circleCenterY

    if (dx * dx + dy * dy > CAT_ICON_RADIUS * CAT_ICON_RADIUS) {
      clearCellHover()
      return
    }

    const stats = getCategoryStats(group)
    setCellHover(
      `category:${teamId}:${group.category}:${stats.solved}:${stats.total}`,
      {
        type: 'category',
        teamId,
        categoryName: group.config.name,
        solved: stats.solved,
        total: stats.total,
      },
      rect.left + circleCenterX,
      rect.top + circleCenterY - CAT_ICON_RADIUS
    )
  }

  function handleMouseLeave() {
    if (isScrolling) return
    clearCellHover()
  }
</script>

<div
  class={cn(
    'bg-background-l2 flex gap-1 rounded-r-md pr-(--diagonal-overflow) pl-1 contain-[layout_style_paint]',
    isScrolling && 'pointer-events-none',
    isCurrentUser && 'bg-background-self-l0'
  )}
>
  {#snippet stripImage()}
    {#if strip}
      <!-- inline svg renders synchronously with the row, avoiding the async
           image loading pipeline that causes challenge circles to lag behind -->
      <div
        class="block h-16 shrink-0 select-none"
        style:width={strip.width + 'px'}
        aria-hidden="true"
      >
        {@html strip.svg}
      </div>
    {:else}
      <div class="h-16 shrink-0" style:width={imageWidth + 'px'}></div>
    {/if}
  {/snippet}

  {#if viewMode === 'categories'}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="shrink-0" onmousemove={handleCategoryMouseMove} onmouseleave={handleMouseLeave}>
      {@render stripImage()}
    </div>
  {:else}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="shrink-0" onmousemove={handleChallengeMouseMove} onmouseleave={handleMouseLeave}>
      {@render stripImage()}
    </div>
  {/if}
</div>
