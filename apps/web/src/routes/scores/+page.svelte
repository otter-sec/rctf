<script lang="ts">
  import { goto } from '$app/navigation'
  import { page as pageState } from '$app/state'
  import { onMount } from 'svelte'

  import { ScrollArea, Tooltip } from '$lib/components'
  import { CtfNotStarted } from '$lib/components'
  import {
    ApiError,
    useCurrentUser,
    useInfiniteLeaderboard,
    useLeaderboardChallenges,
    useSelfUserGraph,
    useTopGraphData,
  } from '$lib/query'
  import { useInfiniteVirtualScroll, type ScrollMetrics } from '$lib/utils'
  import { getCategoryConfig, getScoreboardCategoryOrder } from '$lib/utils/categories'
  import { formatLocalTime } from '$lib/utils/time'

  import { CUTOFF_TIME, SPARKLINE_WINDOW } from './constants'
  import ScoresChallengeHeader from './scores-challenge-header.svelte'
  import ScoresFades from './scores-fades.svelte'
  import ScoresGraph from './scores-graph.svelte'
  import ScoresTeamRow from './scores-team-row.svelte'
  import ScoresToolbar from './scores-toolbar.svelte'
  import type { CategoryGroup, ChallengeInfo, SortMode, TooltipData, ViewMode } from './types'

  const STORAGE_KEY = 'rctf:scores:preferences'
  const LEADERBOARD_PAGE_SIZE = 100
  const ROW_GAP = 4
  const ROW_HEIGHT = 64 + ROW_GAP
  const CELL_WIDTH = 48
  const HEADER_HEIGHT = 192
  const DIAGONAL_OVERFLOW = 96
  const TOOLTIP_DELAY = 300
  const BLOOD_LABELS = ['First blood!', 'Second blood!', 'Third blood!']

  interface ScoresPreferences {
    viewMode: ViewMode
    sortMode: SortMode
    showTop3Context: boolean
  }

  function loadPreferences(): Partial<ScoresPreferences> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  }

  function savePreferences(prefs: Partial<ScoresPreferences>) {
    try {
      const current = loadPreferences()
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...prefs }))
    } catch {
      // ignore storage errors
    }
  }

  const savedPrefs = loadPreferences()

  const viewMode = $derived.by((): ViewMode => {
    const v = pageState.url.searchParams.get('view')
    if (v === 'challenges' || v === 'categories') return v
    if (savedPrefs.viewMode) return savedPrefs.viewMode
    return 'challenges'
  })

  const sortMode = $derived.by((): SortMode => {
    const s = pageState.url.searchParams.get('sort')
    if (s === 'solves') return 'solves'
    if (s === null && savedPrefs.sortMode) return savedPrefs.sortMode
    return 'categories'
  })

  let showTop3Context = $state(savedPrefs.showTop3Context ?? true)

  function setViewMode(v: ViewMode) {
    savePreferences({ viewMode: v })
    const url = new URL(pageState.url)
    if (v === 'challenges') url.searchParams.delete('view')
    else url.searchParams.set('view', v)
    goto(url, { replaceState: true, keepFocus: true, noScroll: true })
  }

  function setSortMode(s: SortMode) {
    savePreferences({ sortMode: s })
    const url = new URL(pageState.url)
    if (s === 'categories') url.searchParams.delete('sort')
    else url.searchParams.set('sort', s)
    goto(url, { replaceState: true, keepFocus: true, noScroll: true })
  }

  function setShowTop3Context(v: boolean) {
    savePreferences({ showTop3Context: v })
    showTop3Context = v
  }

  let isDesktop = $state(true)

  onMount(() => {
    const mql = window.matchMedia('(min-width: 768px)')
    const update = () => (isDesktop = mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  })

  const leaderboardQuery = useInfiniteLeaderboard({ pageSize: LEADERBOARD_PAGE_SIZE })
  const challengesQuery = $derived(useLeaderboardChallenges())
  const graphQuery = useTopGraphData({ limit: 10 })
  const userQuery = useCurrentUser()

  const entries = $derived($leaderboardQuery.data?.pages.flatMap(p => p.leaderboard) ?? [])
  const total = $derived($leaderboardQuery.data?.pages[0]?.total ?? 0)
  const currentUser = $derived($userQuery.data)
  const challengesData = $derived($challengesQuery.data ?? {})
  const graphData = $derived($graphQuery.data ?? [])

  const isNotStarted = $derived(ApiError.isNotStarted($leaderboardQuery.error))
  const isLoading = $derived($leaderboardQuery.isLoading || $challengesQuery.isLoading)

  const challengesByCategory = $derived<ChallengeInfo[]>(
    Object.entries(challengesData)
      .map(([id, info]) => ({
        id,
        ...info,
        order: getScoreboardCategoryOrder(info.category),
        config: getCategoryConfig(info.category),
      }))
      .sort((a, b) => {
        if (a.order !== b.order) {
          if (a.order === -1 && b.order === -1) return a.category.localeCompare(b.category)
          if (a.order === -1) return 1
          if (b.order === -1) return -1
          return a.order - b.order
        }
        if (a.category !== b.category) return a.category.localeCompare(b.category)
        return b.points - a.points || a.name.localeCompare(b.name)
      })
  )

  const challengesBySolves = $derived<ChallengeInfo[]>(
    [...challengesByCategory].sort((a, b) => a.solves - b.solves || a.name.localeCompare(b.name))
  )

  const challenges = $derived(sortMode === 'solves' ? challengesBySolves : challengesByCategory)

  const categoryGroups = $derived<CategoryGroup[]>(
    challengesByCategory.reduce<CategoryGroup[]>((groups, challenge) => {
      const last = groups.at(-1)
      if (last?.category === challenge.category) {
        last.challenges.push(challenge)
      } else {
        groups.push({
          category: challenge.category,
          config: challenge.config,
          challenges: [challenge],
        })
      }
      return groups
    }, [])
  )

  const solvesByTeam = $derived(new Map(entries.map(e => [e.id, new Set(e.solves.map(s => s.id))])))
  const solveTimesByTeam = $derived(
    new Map(entries.map(e => [e.id, new Map(e.solves.map(s => [s.id, s.solveTime]))]))
  )

  function getBloodIndex(challengeId: string, teamId: string): number {
    const challenge = (challengesData as Record<string, { firstSolvers?: { id: string }[] }>)[
      challengeId
    ]
    if (!challenge?.firstSolvers) return -1
    return challenge.firstSolvers.findIndex(s => s.id === teamId)
  }

  function getCategoryStatsForSolves(solves: Set<string> | null, group: CategoryGroup) {
    const solvedCount = solves ? group.challenges.filter(c => solves.has(c.id)).length : 0
    return {
      solved: solvedCount,
      total: group.challenges.length,
      percent: group.challenges.length > 0 ? (solvedCount / group.challenges.length) * 100 : 0,
    }
  }

  const userEntryIndex = $derived(
    currentUser ? entries.findIndex(e => e.id === currentUser.id) : -1
  )

  let userVisibleInViewport = $state(false)

  const showSelfRow = $derived.by(() => {
    if (isLoading && currentUser) return true
    if (!currentUser?.globalPlace) return false
    if (userVisibleInViewport) return false
    return true
  })

  const selfGraphQuery = $derived(
    useSelfUserGraph(showSelfRow && currentUser?.globalPlace ? currentUser.globalPlace : null)
  )

  const sparklineDataByTeam = $derived.by(() => {
    const selfGraphData = $selfGraphQuery.data
    const filterPoints = (points: { time: number; score: number }[], minTime = 0) =>
      points.filter(p => p.time >= minTime && p.time <= CUTOFF_TIME)

    const allTeams =
      selfGraphData && !graphData.some(t => t.id === selfGraphData.id)
        ? [...graphData, selfGraphData]
        : graphData

    const maxTime = Math.max(...allTeams.flatMap(t => filterPoints(t.points).map(p => p.time)), 0)
    const windowStart = maxTime - SPARKLINE_WINDOW

    return new Map(allTeams.map(team => [team.id, filterPoints(team.points, windowStart)]))
  })

  let hoveredTeamId = $state<string | null>(null)
  let solveHighlight = $state<{ teamId: string; time: number } | null>(null)

  let tooltipData = $state<TooltipData | null>(null)
  let tooltipOpen = $state(false)
  let tooltipAnchorRect = $state({ x: 0, y: 0 })
  let hoverTimeout: ReturnType<typeof setTimeout> | null = null

  const tooltipAnchor = {
    getBoundingClientRect: () => ({
      x: tooltipAnchorRect.x,
      y: tooltipAnchorRect.y,
      top: tooltipAnchorRect.y,
      left: tooltipAnchorRect.x,
      bottom: tooltipAnchorRect.y,
      right: tooltipAnchorRect.x,
      width: 0,
      height: 0,
      toJSON: () => ({}),
    }),
  }

  function handleCellHover(data: TooltipData | null, x: number, y: number) {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      hoverTimeout = null
    }

    if (data) {
      tooltipOpen = false

      hoverTimeout = setTimeout(() => {
        if (data.type === 'challenge' && !data.solved) {
          hoveredTeamId = null
          solveHighlight = null
        } else {
          hoveredTeamId = data.teamId
          if (data.type === 'challenge' && data.solveTime) {
            solveHighlight = { teamId: data.teamId, time: data.solveTime }
          } else {
            solveHighlight = null
          }
        }

        tooltipData = data
        tooltipAnchorRect = { x, y }
        tooltipOpen = true
      }, TOOLTIP_DELAY)
    } else {
      hoveredTeamId = null
      solveHighlight = null
      tooltipOpen = false
    }
  }

  let headerRowRef = $state<HTMLElement | null>(null)
  let listScrollMargin = $state(0)

  let showTopFade = $state(false)
  let showBottomFade = $state(false)
  let showLeftFade = $state(false)
  let showRightFade = $state(false)

  function updateFades(metrics: ScrollMetrics) {
    const threshold = 10
    const nextTop = metrics.scrollTop > threshold
    const nextBottom = metrics.scrollTop + metrics.clientHeight < metrics.scrollHeight - threshold
    const nextLeft = metrics.scrollLeft > threshold
    const nextRight = metrics.scrollLeft + metrics.clientWidth < metrics.scrollWidth - threshold

    if (showTopFade !== nextTop) showTopFade = nextTop
    if (showBottomFade !== nextBottom) showBottomFade = nextBottom
    if (showLeftFade !== nextLeft) showLeftFade = nextLeft
    if (showRightFade !== nextRight) showRightFade = nextRight
  }

  function updateFadesFromViewport() {
    const viewport = scroll.state.viewportRef
    if (!viewport) return
    updateFades({
      scrollTop: viewport.scrollTop,
      scrollLeft: viewport.scrollLeft,
      scrollHeight: viewport.scrollHeight,
      scrollWidth: viewport.scrollWidth,
      clientHeight: viewport.clientHeight,
      clientWidth: viewport.clientWidth,
    })
  }

  const scroll = useInfiniteVirtualScroll({
    rowHeight: ROW_HEIGHT,
    overscan: 5,
    isScrollingResetDelay: 100,
    onLoadMore: () => $leaderboardQuery.fetchNextPage(),
    onScroll: metrics => updateFades(metrics),
  })

  const contentWidth = $derived.by(() => {
    const cellCount = viewMode === 'categories' ? categoryGroups.length : challenges.length
    return cellCount * (CELL_WIDTH + ROW_GAP) + DIAGONAL_OVERFLOW
  })

  $effect(() => {
    const header = headerRowRef
    if (!header) {
      listScrollMargin = 0
      return
    }

    const ro = new ResizeObserver(entries => {
      const h = entries[0]?.contentRect.height ?? 0
      listScrollMargin = Math.round(h)
    })
    ro.observe(header)
    listScrollMargin = Math.round(header.getBoundingClientRect().height)

    return () => ro.disconnect()
  })

  $effect(() => {
    const viewport = scroll.state.viewportRef
    if (!viewport) return

    void contentWidth
    void listScrollMargin
    void showSelfRow
    void isDesktop
    void isLoading

    updateFadesFromViewport()

    const ro = new ResizeObserver(() => updateFadesFromViewport())
    ro.observe(viewport, { box: 'border-box' })

    let raf1 = 0
    let raf2 = 0
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => updateFadesFromViewport())
    })

    return () => {
      ro.disconnect()
      if (raf1) cancelAnimationFrame(raf1)
      if (raf2) cancelAnimationFrame(raf2)
    }
  })

  $effect(() => {
    if (isLoading) {
      scroll.state.count = 0
      scroll.state.hasNextPage = false
      scroll.state.isFetching = true
      return
    }

    scroll.state.count = entries.length
    scroll.state.hasNextPage = $leaderboardQuery.hasNextPage
    scroll.state.isFetching = $leaderboardQuery.isFetchingNextPage
    scroll.state.scrollMargin = listScrollMargin
  })

  $effect(() => {
    if (userEntryIndex === -1) {
      userVisibleInViewport = false
      return
    }

    const viewport = scroll.state.viewportRef
    if (!viewport) {
      userVisibleInViewport = false
      return
    }

    void scroll.virtualItems

    const visibleTop = viewport.scrollTop + listScrollMargin
    const visibleBottom = viewport.scrollTop + viewport.clientHeight
    const itemTop = userEntryIndex * ROW_HEIGHT + listScrollMargin
    const itemBottom = itemTop + ROW_HEIGHT

    userVisibleInViewport = itemTop < visibleBottom && itemBottom > visibleTop
  })
</script>

{#if isNotStarted}
  <CtfNotStarted />
{:else}
  <!-- Toolbar (desktop only) -->
  <div class="hidden md:block">
    <ScoresToolbar
      {viewMode}
      {sortMode}
      {total}
      loadedCount={entries.length}
      isFetching={$leaderboardQuery.isFetching}
      {showTop3Context}
      onViewModeChange={setViewMode}
      onSortModeChange={setSortMode}
      onShowTop3ContextChange={setShowTop3Context}
    />
  </div>

  <div class="flex justify-center px-4 md:px-9">
    <div
      class="relative w-full max-w-full md:w-fit"
      style:--row-height="{ROW_HEIGHT - ROW_GAP}px"
      style:--row-height-full="{ROW_HEIGHT}px"
      style:--cell-width="{CELL_WIDTH}px"
      style:--header-height="{HEADER_HEIGHT}px"
      style:--name-row-height="128px"
      style:--diagonal-overflow="96px"
      style:--team-column-width={isDesktop ? 'calc(45vw - 72px)' : '100%'}
      style:--content-column-width={isDesktop ? 'calc(55vw + 72px)' : '0px'}
      style:--self-row-height="{ROW_HEIGHT}px"
      style:--self-row-offset={showSelfRow ? `${ROW_HEIGHT}px` : '0px'}
    >
      <ScoresFades
        showTop={showTopFade}
        showBottom={showBottomFade}
        showLeft={isDesktop && showLeftFade}
        showRight={isDesktop && showRightFade}
        {showSelfRow}
        isMinimal={!isDesktop}
      />

      <div class="bg-background-l1 mb-2 h-(--header-height) rounded-lg md:hidden">
        <ScoresGraph
          class="h-full w-full p-3"
          {hoveredTeamId}
          offset={0}
          {solveHighlight}
          {graphData}
          {showTop3Context}
        />
      </div>

      <ScrollArea
        class={isDesktop
          ? 'h-[calc(100vh-4.5rem-1rem-3rem)]'
          : 'h-[calc(100vh-4.5rem-1rem-var(--header-height)-8px)]'}
        orientation={isDesktop ? 'both' : 'vertical'}
        fadeSize={0}
        bind:viewportRef={scroll.state.viewportRef}
        scrollbarXClasses={isDesktop ? 'pl-(--team-column-width) -mr-[10px] z-40' : 'hidden'}
        scrollbarYClasses={isDesktop
          ? 'pt-(--header-height) pb-[calc(var(--row-height-full)+4px)] z-40'
          : 'pb-[calc(var(--row-height-full)+4px)] z-40'}
      >
        <div class="flex min-h-full flex-col">
          <div
            class="bg-background-l0 sticky top-0 z-20 hidden h-(--header-height) md:flex"
            bind:this={headerRowRef}
          >
            <div
              class="bg-background-l1 sticky left-0 z-30 w-(--team-column-width) shrink-0 rounded-t-3xl rounded-bl-xl"
            >
              <ScoresGraph
                class="h-full w-full p-3"
                {hoveredTeamId}
                offset={0}
                {solveHighlight}
                {graphData}
                {showTop3Context}
              />
            </div>
            {#if !$challengesQuery.isLoading}
              <ScoresChallengeHeader {viewMode} {sortMode} {categoryGroups} {challenges} />
            {/if}
          </div>

          <div
            class="relative contain-[layout_style] backface-hidden"
            style:height={isLoading ? `${10 * ROW_HEIGHT}px` : `${scroll.totalSize}px`}
            style:width={isDesktop ? `calc(var(--team-column-width) + ${contentWidth}px)` : '100%'}
          >
            {#if isLoading}
              {#each Array(10) as _, i}
                <div
                  class="absolute top-0 left-0 flex h-(--row-height-full) w-full will-change-transform contain-[layout_style_paint] md:w-auto"
                  style:transform="translate3d(0, {i * ROW_HEIGHT}px, 0)"
                >
                  <ScoresTeamRow
                    data={null}
                    solves={null}
                    solveTimes={null}
                    isLoading
                    isScrolling={scroll.isScrolling}
                    {contentWidth}
                    {viewMode}
                    {sortMode}
                    {categoryGroups}
                    {challenges}
                    getCategoryStats={group => getCategoryStatsForSolves(null, group)}
                    getBloodIndex={() => -1}
                    onCellHover={handleCellHover}
                    onSparklineHover={() => {}}
                    onSparklineUnhover={() => {}}
                  />
                </div>
              {/each}
            {:else}
              {#each scroll.virtualItems as row (row.index)}
                {#if row.index < entries.length}
                  {@const entry = entries[row.index]!}
                  {@const solves = solvesByTeam.get(entry.id) ?? new Set()}
                  {@const solveTimes = solveTimesByTeam.get(entry.id) ?? null}

                  <div
                    class="absolute top-0 left-0 flex w-full will-change-transform contain-[layout_style_paint] md:w-auto"
                    style:height="{row.size}px"
                    style:transform="translate3d(0, {row.start - listScrollMargin}px, 0)"
                  >
                    <ScoresTeamRow
                      data={{
                        id: entry.id,
                        rank: row.index + 1,
                        name: entry.name,
                        avatarUrl: entry.avatarUrl,
                        countryCode: entry.countryCode,
                        statusText: entry.statusText,
                        score: entry.score,
                        solveCount: entry.solves.length,
                        sparklineData: sparklineDataByTeam.get(entry.id),
                        isCurrentUser: currentUser?.id === entry.id,
                      }}
                      {solves}
                      {solveTimes}
                      isScrolling={scroll.isScrolling}
                      {contentWidth}
                      {viewMode}
                      {sortMode}
                      {categoryGroups}
                      {challenges}
                      getCategoryStats={group => getCategoryStatsForSolves(solves, group)}
                      getBloodIndex={cid => getBloodIndex(cid, entry.id)}
                      onCellHover={handleCellHover}
                      onSparklineHover={() => (hoveredTeamId = entry.id)}
                      onSparklineUnhover={() => (hoveredTeamId = null)}
                    />
                  </div>
                {/if}
              {/each}
            {/if}
          </div>

          {#if showSelfRow && currentUser}
            {@const selfSolves = new Set(currentUser.solves.map(s => s.id))}
            {@const selfSolveTimes = new Map(currentUser.solves.map(s => [s.id, s.createdAt]))}
            <div
              class="bg-background-l0 sticky bottom-0 z-20 mt-auto flex h-(--row-height-full) pt-1 will-change-transform contain-[layout_style_paint]"
            >
              <ScoresTeamRow
                data={{
                  id: currentUser.id,
                  rank: currentUser.globalPlace ?? null,
                  name: currentUser.name,
                  avatarUrl: currentUser.avatarUrl,
                  countryCode: currentUser.countryCode,
                  statusText: currentUser.statusText,
                  score: currentUser.score,
                  solveCount: currentUser.solves.length,
                  sparklineData: sparklineDataByTeam.get(currentUser.id),
                  isCurrentUser: true,
                }}
                solves={isLoading ? null : selfSolves}
                solveTimes={isLoading ? null : selfSolveTimes}
                isSelf
                {isLoading}
                isScrolling={scroll.isScrolling}
                {contentWidth}
                {viewMode}
                {sortMode}
                {categoryGroups}
                {challenges}
                getCategoryStats={group => getCategoryStatsForSolves(selfSolves, group)}
                getBloodIndex={cid => getBloodIndex(cid, currentUser.id)}
                onCellHover={handleCellHover}
                onSparklineHover={() => (hoveredTeamId = currentUser.id)}
                onSparklineUnhover={() => (hoveredTeamId = null)}
              />
            </div>
          {/if}
        </div>
      </ScrollArea>
    </div>
  </div>
{/if}

<Tooltip.Root bind:open={tooltipOpen}>
  <Tooltip.Trigger class="pointer-events-none fixed size-0" aria-hidden="true" />
  <Tooltip.Content side="top" sideOffset={8} customAnchor={tooltipAnchor}>
    {#if tooltipData?.type === 'category'}
      <p class="capitalize">{tooltipData.categoryName}</p>
      <p class="text-foreground-l3">{tooltipData.solved} / {tooltipData.total} solved</p>
    {:else if tooltipData?.type === 'challenge'}
      {@const statusText =
        BLOOD_LABELS[tooltipData.bloodIndex] ?? (tooltipData.solved ? 'Solved!' : 'Unsolved')}
      <p>{tooltipData.challengeName}</p>
      <p class="text-foreground-l3">{tooltipData.points} pts · {statusText}</p>
      {#if tooltipData.solveTime}
        <p class="text-foreground-l3">{formatLocalTime(tooltipData.solveTime)}</p>
      {/if}
    {/if}
  </Tooltip.Content>
</Tooltip.Root>
