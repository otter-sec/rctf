<script lang="ts">
  import { browser } from '$app/environment'
  import { goto } from '$app/navigation'
  import { page as pageState } from '$app/state'
  import { onMount } from 'svelte'
  import { get } from 'svelte/store'
  import { createVirtualizer } from '@tanstack/svelte-virtual'
  import type { Virtualizer } from '@tanstack/svelte-virtual'
  import { IconMoodWrrrFilled } from '$lib/icons'
  import { CtfNotStarted, EmptyState, ScrollArea, Spinner } from '$lib/components'
  import {
    ApiError,
    useClientConfig,
    useCurrentUser,
    useInfiniteLeaderboard,
    useLeaderboardChallenges,
    useSelfUserGraph,
    useTopGraphData,
  } from '$lib/query'
  import { cn } from '$lib/utils'
  import { getCategoryConfig, getCategoryOrder } from '$lib/utils/categories'
  import { CUTOFF_TIME, DELTA_WINDOW, PAGE_SIZE, SPARKLINE_WINDOW } from './constants'
  import ScoresFades from './scores-fades.svelte'
  import ScoresGraph from './scores-graph.svelte'
  import ScoresChallengeHeader from './scores-challenge-header.svelte'
  import ScoresMobile from './scores-mobile.svelte'
  import ScoresSolveCells from './scores-solve-cells.svelte'
  import ScoresSolveTooltip from './scores-solve-tooltip.svelte'
  import ScoresTeamRow from './scores-team-row.svelte'
  import ScoresToolbar from './scores-toolbar.svelte'
  import SkeletonRow from './skeleton-row.svelte'
  import type { CategoryGroup, ChallengeInfo, SortMode, TooltipData, ViewMode } from './types'

  const STORAGE_KEY = 'rctf:scores:preferences'

  interface ScoresPreferences {
    viewMode: ViewMode
    sortMode: SortMode
    showTop3Context: boolean
  }

  function loadPreferences(): Partial<ScoresPreferences> {
    if (!browser) return {}
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  }

  function savePreferences(prefs: Partial<ScoresPreferences>) {
    if (!browser) return
    try {
      const current = loadPreferences()
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...prefs }))
    } catch {
      // ignore storage errors
    }
  }

  const savedPrefs = loadPreferences()

  const viewMode = $derived.by(() => {
    const v = pageState.url.searchParams.get('view')
    if (v === 'challenges' || v === 'categories' || v === 'minimal') return v as ViewMode
    if (savedPrefs.viewMode) return savedPrefs.viewMode
    return 'challenges' as ViewMode
  })

  const sortMode = $derived.by(() => {
    const s = pageState.url.searchParams.get('sort')
    if (s === 'solves') return 'solves' as SortMode
    if (s === null && savedPrefs.sortMode) return savedPrefs.sortMode
    return 'categories' as SortMode
  })

  function setParam(key: string, value: string | number, defaultValue: string | number) {
    const url = new URL(pageState.url)
    if (value === defaultValue) url.searchParams.delete(key)
    else url.searchParams.set(key, String(value))
    goto(url, { replaceState: true, keepFocus: true, noScroll: true })
  }

  function setViewMode(v: ViewMode) {
    savePreferences({ viewMode: v })
    const url = new URL(pageState.url)
    url.searchParams.set('view', v)
    goto(url, { replaceState: true, keepFocus: true, noScroll: true })
  }

  function setSortMode(s: SortMode) {
    savePreferences({ sortMode: s })
    setParam('sort', s, 'categories')
  }

  function setShowTop3Context(v: boolean) {
    savePreferences({ showTop3Context: v })
    showTop3Context = v
  }

  const LEADERBOARD_PAGE_SIZE = 100

  const leaderboardQuery = useInfiniteLeaderboard({ pageSize: LEADERBOARD_PAGE_SIZE })
  const graphQuery = useTopGraphData({ limit: 10 })
  const challengesQuery = $derived(useLeaderboardChallenges())
  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()

  const entries = $derived($leaderboardQuery.data?.pages.flatMap(p => p.leaderboard) ?? [])
  const graphData = $derived($graphQuery.data ?? [])
  const total = $derived($leaderboardQuery.data?.pages[0]?.total ?? 0)
  const currentUser = $derived($userQuery.data)
  const challengesData = $derived($challengesQuery.data ?? {})
  const clientConfig = $derived($clientConfigQuery.data)

  const isNotStarted = $derived(ApiError.isNotStarted($leaderboardQuery.error))

  const showDivision = $derived(
    clientConfig ? Object.keys(clientConfig.divisions).length > 1 : true
  )

  const challengesByCategory = $derived<ChallengeInfo[]>(
    Object.entries(challengesData)
      .map(([id, info]) => ({
        id,
        ...info,
        order: getCategoryOrder(info.category),
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
  const solvesWithTimeByTeam = $derived(
    new Map(entries.map(e => [e.id, new Map(e.solves.map(s => [s.id, s.solveTime]))]))
  )

  const showSelfRow = $derived.by(() => {
    if (!currentUser?.globalPlace) return false
    return !entries.some(e => e.id === currentUser.id)
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

  const rankDeltaByTeam = $derived.by(() => {
    const selfGraphData = $selfGraphQuery.data
    const allPoints = graphData.flatMap(t => t.points.filter(p => p.time <= CUTOFF_TIME))
    if (allPoints.length === 0) return new Map<string, number>()

    const currentTime = Math.max(...allPoints.map(p => p.time))
    const pastTime = currentTime - DELTA_WINDOW

    const getLatestScore = (points: { time: number; score: number }[], targetTime: number) => {
      const valid = points.filter(p => p.time <= targetTime && p.time <= CUTOFF_TIME)
      if (!valid.length) return 0
      return valid.reduce((latest, p) => (p.time > latest.time ? p : latest)).score
    }

    const allTeams =
      selfGraphData && !graphData.some(t => t.id === selfGraphData.id)
        ? [...graphData, selfGraphData]
        : graphData

    const teamsWithScores = allTeams.map(team => ({
      id: team.id,
      currentScore: getLatestScore(team.points, currentTime),
      pastScore: getLatestScore(team.points, pastTime),
    }))

    const getRanks = (key: 'currentScore' | 'pastScore') =>
      new Map([...teamsWithScores].sort((a, b) => b[key] - a[key]).map((t, i) => [t.id, i + 1]))

    const currentRankMap = getRanks('currentScore')
    const pastRankMap = getRanks('pastScore')

    return new Map(
      teamsWithScores
        .map(t => [t.id, (pastRankMap.get(t.id) ?? 0) - (currentRankMap.get(t.id) ?? 0)] as const)
        .filter(([, delta]) => delta !== 0)
    )
  })

  let showTop3Context = $state(savedPrefs.showTop3Context ?? true)
  let hoveredTeamId = $state<string | null>(null)
  let tooltipData = $state<TooltipData | null>(null)
  let tooltipX = $state(0)
  let tooltipY = $state(0)
  let hoverTimeout: ReturnType<typeof setTimeout> | null = null

  const solveHighlight = $derived(
    tooltipData?.solved && tooltipData.solveTime
      ? { teamId: tooltipData.teamId, time: tooltipData.solveTime }
      : null
  )

  let mediaReady = $state(false)
  let isDesktop = $state(false)
  let headerRowRef = $state<HTMLElement | null>(null)
  let listScrollMargin = $state(0)

  onMount(() => {
    mediaReady = true
    const mql = window.matchMedia('(min-width: 768px)')
    const update = () => (isDesktop = mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  })

  $effect(() => {
    if (!browser) return

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

  function handleCellHover(data: TooltipData | null, x: number, y: number) {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      hoverTimeout = null
    }

    if (data) {
      hoverTimeout = setTimeout(() => {
        hoveredTeamId = data.teamId
        tooltipData = data
        tooltipX = x
        tooltipY = y
      }, 300)
    } else {
      hoveredTeamId = null
      tooltipData = null
    }
  }

  function getCategoryStats(teamId: string, group: CategoryGroup) {
    const isSelf = teamId === currentUser?.id
    const solvedCount = isSelf
      ? group.challenges.filter(c => currentUser!.solves.some(s => s.id === c.id)).length
      : group.challenges.filter(c => solvesByTeam.get(teamId)?.has(c.id)).length
    return {
      solved: solvedCount,
      total: group.challenges.length,
      percent: (solvedCount / group.challenges.length) * 100,
    }
  }

  function getBloodIndex(challengeId: string, teamId: string): number {
    const challenge = challengesData[challengeId]
    if (!challenge?.firstSolvers) return -1
    return challenge.firstSolvers.findIndex(s => s.id === teamId)
  }

  let viewportRef = $state<HTMLElement | null>(null)
  let showTopFade = $state(false)
  let showBottomFade = $state(true)
  let showLeftFade = $state(false)
  let showRightFade = $state(true)

  function updateFades() {
    const v = viewportRef
    if (!v) return

    const threshold = 10
    const nextTop = v.scrollTop > threshold
    const nextBottom = v.scrollTop + v.clientHeight < v.scrollHeight - threshold
    const nextLeft = v.scrollLeft > threshold
    const nextRight = v.scrollLeft + v.clientWidth < v.scrollWidth - threshold

    if (showTopFade !== nextTop) showTopFade = nextTop
    if (showBottomFade !== nextBottom) showBottomFade = nextBottom
    if (showLeftFade !== nextLeft) showLeftFade = nextLeft
    if (showRightFade !== nextRight) showRightFade = nextRight
  }

  // FIXME
  const ROW_HEIGHT = 68

  type ObserveRectCallback = (rect: { width: number; height: number }) => void
  type ObserveOffsetCallback = (offset: number, isScrolling: boolean) => void

  // horrible firefox workaround. FIXME
  function observeElementRectRaf<T extends Element>(
    instance: Virtualizer<T, any>,
    cb: ObserveRectCallback
  ) {
    const element = instance.scrollElement as unknown as HTMLElement | null
    if (!element) return
    const targetWindow = instance.targetWindow
    if (!targetWindow) return

    let raf = 0
    let lastWidth = -1
    let lastHeight = -1
    let hasNonZero = false
    let ro: ResizeObserver | null = null

    const measure = () => {
      raf = 0

      const { width, height } = element.getBoundingClientRect()
      const w = Math.round(width)
      const h = Math.round(height)

      // ignore 0 updates to prevent the range from going empty
      if (hasNonZero && (w === 0 || h === 0)) {
        raf = targetWindow.requestAnimationFrame(measure)
        return
      }

      if (w !== lastWidth || h !== lastHeight) {
        lastWidth = w
        lastHeight = h
        if (w > 0 && h > 0) hasNonZero = true
        cb({ width: w, height: h })
      }

      if (!hasNonZero) {
        raf = targetWindow.requestAnimationFrame(measure)
      }
    }

    const schedule = () => {
      if (raf) return
      raf = targetWindow.requestAnimationFrame(measure)
    }

    schedule()

    const RO = targetWindow.ResizeObserver
    if (RO) {
      ro = new RO(schedule)
      ro.observe(element, { box: 'border-box' })
    }

    return () => {
      ro?.disconnect()
      if (raf) targetWindow.cancelAnimationFrame(raf)
    }
  }

  function observeElementOffsetRaf<T extends Element>(
    instance: Virtualizer<T, any>,
    cb: ObserveOffsetCallback
  ) {
    const element = instance.scrollElement
    if (!element) return
    const targetWindow = instance.targetWindow
    if (!targetWindow) return

    let raf = 0
    let timeoutId: number | undefined
    let latestOffset = 0
    let latestIsScrolling = false

    const computeOffset = () => {
      const { horizontal, isRtl } = instance.options
      return horizontal ? element.scrollLeft * ((isRtl && -1) || 1) : element.scrollTop
    }

    const schedule = () => {
      if (raf) return
      raf = targetWindow.requestAnimationFrame(() => {
        raf = 0
        cb(latestOffset, latestIsScrolling)
      })
    }

    const notify = (isScrolling: boolean) => {
      latestIsScrolling = isScrolling
      latestOffset = computeOffset()
      schedule()
    }

    const onScroll = () => {
      notify(true)
      if (timeoutId) targetWindow.clearTimeout(timeoutId)
      timeoutId = targetWindow.setTimeout(
        () => notify(false),
        instance.options.isScrollingResetDelay
      )
    }

    notify(false)

    element.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      element.removeEventListener('scroll', onScroll)
      if (raf) targetWindow.cancelAnimationFrame(raf)
      if (timeoutId) targetWindow.clearTimeout(timeoutId)
    }
  }

  const virtualizer = createVirtualizer({
    count: 0,
    getScrollElement: () => viewportRef,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    scrollMargin: 0,
    observeElementRect: observeElementRectRaf,
    observeElementOffset: observeElementOffsetRaf,
    isScrollingResetDelay: 100,
  })

  let lastVirtualCount = -1
  let lastVirtualScrollMargin = -1
  let lastVirtualScrollElement: HTMLElement | null = null
  $effect(() => {
    const scrollElement = viewportRef
    const count = $leaderboardQuery.hasNextPage ? entries.length + 1 : entries.length
    const scrollMargin = listScrollMargin
    if (
      count === lastVirtualCount &&
      scrollMargin === lastVirtualScrollMargin &&
      scrollElement === lastVirtualScrollElement
    )
      return
    lastVirtualCount = count
    lastVirtualScrollMargin = scrollMargin
    lastVirtualScrollElement = scrollElement
    get(virtualizer).setOptions({ count, scrollMargin })
  })

  let loadMoreTriggered = false
  $effect(() => {
    const v = viewportRef
    if (!v) return

    let raf = 0
    const run = () => {
      raf = 0
      updateFades()

      if (
        loadMoreTriggered ||
        !$leaderboardQuery.hasNextPage ||
        $leaderboardQuery.isFetchingNextPage
      )
        return
      const scrollPercent = (v.scrollTop + v.clientHeight) / v.scrollHeight
      if (scrollPercent > 0.7) {
        loadMoreTriggered = true
        $leaderboardQuery.fetchNextPage()
      }
    }

    const schedule = () => {
      if (raf) return
      raf = requestAnimationFrame(run)
    }

    v.addEventListener('scroll', schedule, { passive: true })
    const observer = new ResizeObserver(schedule)
    observer.observe(v)
    schedule()

    return () => {
      v.removeEventListener('scroll', schedule)
      observer.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  })

  $effect(() => {
    if (!$leaderboardQuery.isFetchingNextPage) {
      loadMoreTriggered = false
    }
  })
</script>

{#if isNotStarted}
  <CtfNotStarted />
{:else if !browser || !mediaReady}
  <ScoresMobile
    {entries}
    {graphData}
    {currentUser}
    {showSelfRow}
    {rankDeltaByTeam}
    isFetching={$leaderboardQuery.isFetching}
    isFetchingNextPage={$leaderboardQuery.isFetchingNextPage}
    isLoading={$leaderboardQuery.isLoading}
    hasNextPage={$leaderboardQuery.hasNextPage}
    {hoveredTeamId}
    {solveHighlight}
    {showTop3Context}
    {showDivision}
    {total}
    onLoadMore={() => $leaderboardQuery.fetchNextPage()}
  />

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

    <div class="flex justify-center px-9">
      <div
        class={cn(
          'scoreboard relative',
          viewMode === 'minimal' ? 'w-full max-w-2xl' : 'w-fit max-w-full'
        )}
        style:--self-row-offset={showSelfRow ? 'var(--self-row-height)' : '0px'}
        style:--team-column-width={viewMode === 'minimal' ? '100%' : undefined}
      >
        <ScoresFades
          showTop={showTopFade}
          showBottom={showBottomFade}
          showLeft={showLeftFade}
          showRight={showRightFade}
          {showSelfRow}
          isMinimal={viewMode === 'minimal'}
        />

        <ScrollArea
          class="h-[calc(100vh-140px)] rounded-lg"
          orientation="both"
          fadeSize={0}
          scrollbarXStyles={viewMode === 'minimal'
            ? ''
            : 'padding-left: var(--team-column-width); margin-right: -10px; z-index: 40;'}
          scrollbarYStyles="padding-top: var(--header-height); padding-bottom: calc(var(--self-row-offset) + 8px); z-index: 40;"
          bind:viewportRef
        >
          <div class="header-row bg-background-l0 sticky top-0 z-20 flex" bind:this={headerRowRef}>
            <div class="col-team bg-background-l0 sticky left-0 z-30">
              <div
                class={cn(
                  'bg-background-l1 h-(--header-height) rounded-3xl rounded-b-lg',
                  viewMode !== 'minimal' && 'rounded-br-none'
                )}
              >
                <ScoresGraph
                  class="h-full w-full"
                  {hoveredTeamId}
                  offset={0}
                  {solveHighlight}
                  {graphData}
                  {showTop3Context}
                />
              </div>
            </div>

            {#if viewMode !== 'minimal' && !$challengesQuery.isLoading}
              <ScoresChallengeHeader {viewMode} {sortMode} {categoryGroups} {challenges} />
            {/if}
          </div>

          <div class="relative" style="height: {$virtualizer.getTotalSize()}px; width: 100%;">
            {#if $leaderboardQuery.isLoading && $challengesQuery.isLoading && entries.length === 0}
              <div class="flex flex-col gap-1">
                {#each Array(PAGE_SIZE) as _}
                  <SkeletonRow {showDivision} isMinimal={viewMode === 'minimal'} />
                {/each}
              </div>
            {:else if $leaderboardQuery.isLoading && entries.length === 0}
              {@const colCount =
                viewMode === 'categories' ? categoryGroups.length : challenges.length}
              <div class="flex flex-col gap-1">
                {#each Array(PAGE_SIZE) as _}
                  <SkeletonRow
                    {showDivision}
                    isMinimal={viewMode === 'minimal'}
                    colCount={viewMode !== 'minimal' ? colCount : 0}
                  />
                {/each}
              </div>
            {:else if entries.length === 0 && !$leaderboardQuery.isLoading}
              <div
                class={cn(
                  'bg-background-l1 rounded-b-3xl',
                  viewMode === 'minimal' ? 'w-full' : 'w-fit min-w-(--team-column-width)'
                )}
              >
                <EmptyState
                  icon={IconMoodWrrrFilled}
                  title="No solves yet"
                  subtitle="The leaderboard will populate as teams solve challenges"
                />
              </div>
            {:else}
              {#each $virtualizer.getVirtualItems() as row (row.index)}
                {#if row.index > entries.length - 1}
                  <div
                    class="absolute top-0 left-0 flex w-full items-center justify-center"
                    style="height: {row.size}px; transform: translateY({row.start -
                      listScrollMargin}px);"
                  >
                    {#if $leaderboardQuery.hasNextPage}
                      <Spinner class="text-foreground-l3 size-5" />
                    {/if}
                  </div>
                {:else if entries[row.index]}
                  {@const entry = entries[row.index]!}
                  {@const rank = row.index + 1}
                  {@const solves = solvesByTeam.get(entry.id)}
                  {@const solveTimes = solvesWithTimeByTeam.get(entry.id)}
                  {@const isYou = currentUser?.id === entry.id}

                  <div
                    class={cn(
                      'bg-background-l1 data-row group absolute top-0 left-0 flex min-w-0 rounded-lg',
                      viewMode === 'minimal' ? 'w-full' : 'w-fit'
                    )}
                    style="height: {row.size}px; transform: translateY({row.start -
                      listScrollMargin}px);"
                  >
                    <ScoresTeamRow
                      id={entry.id}
                      name={entry.name}
                      avatarUrl={entry.avatarUrl}
                      division={entry.division}
                      divisionPlace={entry.divisionPlace}
                      countryCode={entry.countryCode}
                      statusText={entry.statusText}
                      score={entry.score}
                      solveCount={entry.solves.length}
                      {rank}
                      isCurrentUser={isYou}
                      isFullWidth={viewMode === 'minimal'}
                      sparklineData={$virtualizer.isScrolling
                        ? []
                        : (sparklineDataByTeam.get(entry.id) ?? [])}
                      delta={rankDeltaByTeam.get(entry.id)}
                      {showDivision}
                      onHover={() => (hoveredTeamId = entry.id)}
                      onUnhover={() => (hoveredTeamId = null)}
                    />

                    {#if viewMode !== 'minimal'}
                      <ScoresSolveCells
                        teamId={entry.id}
                        {viewMode}
                        {sortMode}
                        isScrolling={$virtualizer.isScrolling}
                        {categoryGroups}
                        {challenges}
                        getSolves={cid => solves?.has(cid) ?? false}
                        getSolveTime={cid => solveTimes?.get(cid)}
                        getCategoryStats={group => getCategoryStats(entry.id, group)}
                        getBloodIndex={cid => getBloodIndex(cid, entry.id)}
                        onCellHover={handleCellHover}
                      />
                    {/if}
                  </div>
                {/if}
              {/each}
            {/if}
          </div>

          {#if showSelfRow && currentUser}
            <div class="bg-background-l0 sticky bottom-0 z-20 mt-4 h-(--self-row-height)">
              <div
                class={cn(
                  'bg-background-l1 data-row group flex min-w-0 rounded-lg',
                  viewMode === 'minimal' ? 'w-full' : 'w-fit'
                )}
              >
                <ScoresTeamRow
                  id={currentUser.id}
                  name={currentUser.name}
                  avatarUrl={currentUser.avatarUrl}
                  division={currentUser.division}
                  divisionPlace={currentUser.divisionPlace}
                  countryCode={currentUser.countryCode}
                  statusText={currentUser.statusText}
                  score={currentUser.score}
                  solveCount={currentUser.solves.length}
                  rank={currentUser.globalPlace ?? 0}
                  isCurrentUser={true}
                  isFullWidth={viewMode === 'minimal'}
                  sparklineData={$virtualizer.isScrolling
                    ? []
                    : (sparklineDataByTeam.get(currentUser.id) ?? [])}
                  delta={rankDeltaByTeam.get(currentUser.id)}
                  {showDivision}
                  onHover={() => (hoveredTeamId = currentUser.id)}
                  onUnhover={() => (hoveredTeamId = null)}
                />

                {#if viewMode !== 'minimal'}
                  <ScoresSolveCells
                    teamId={currentUser.id}
                    {viewMode}
                    {sortMode}
                    isScrolling={$virtualizer.isScrolling}
                    {categoryGroups}
                    {challenges}
                    getSolves={cid => currentUser.solves.some(s => s.id === cid)}
                    getSolveTime={cid => currentUser.solves.find(s => s.id === cid)?.createdAt}
                    getCategoryStats={group => getCategoryStats(currentUser.id, group)}
                    getBloodIndex={cid => getBloodIndex(cid, currentUser.id)}
                    onCellHover={handleCellHover}
                  />
                {/if}
              </div>
            </div>
          {/if}
        </ScrollArea>
      </div>
    </div>
  </div>
{:else if isDesktop}
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

    <div class="flex justify-center px-9">
      <div
        class={cn(
          'scoreboard relative',
          viewMode === 'minimal' ? 'w-full max-w-2xl' : 'w-fit max-w-full'
        )}
        style:--self-row-offset={showSelfRow ? 'var(--self-row-height)' : '0px'}
        style:--team-column-width={viewMode === 'minimal' ? '100%' : undefined}
      >
        <ScoresFades
          showTop={showTopFade}
          showBottom={showBottomFade}
          showLeft={showLeftFade}
          showRight={showRightFade}
          {showSelfRow}
          isMinimal={viewMode === 'minimal'}
        />

        <ScrollArea
          class="h-[calc(100vh-140px)] rounded-lg"
          orientation="both"
          fadeSize={0}
          scrollbarXStyles={viewMode === 'minimal'
            ? ''
            : 'padding-left: var(--team-column-width); margin-right: -10px; z-index: 40;'}
          scrollbarYStyles="padding-top: var(--header-height); padding-bottom: calc(var(--self-row-offset) + 8px); z-index: 40;"
          bind:viewportRef
        >
          <div class="header-row bg-background-l0 sticky top-0 z-20 flex" bind:this={headerRowRef}>
            <div class="col-team bg-background-l0 sticky left-0 z-30">
              <div
                class={cn(
                  'bg-background-l1 h-(--header-height) rounded-3xl rounded-b-lg',
                  viewMode !== 'minimal' && 'rounded-br-none'
                )}
              >
                <ScoresGraph
                  class="h-full w-full"
                  {hoveredTeamId}
                  offset={0}
                  {solveHighlight}
                  {graphData}
                  {showTop3Context}
                />
              </div>
            </div>

            {#if viewMode !== 'minimal' && !$challengesQuery.isLoading}
              <ScoresChallengeHeader {viewMode} {sortMode} {categoryGroups} {challenges} />
            {/if}
          </div>

          <div class="relative" style="height: {$virtualizer.getTotalSize()}px; width: 100%;">
            {#if $leaderboardQuery.isLoading && $challengesQuery.isLoading && entries.length === 0}
              <div class="flex flex-col gap-1">
                {#each Array(PAGE_SIZE) as _}
                  <SkeletonRow {showDivision} isMinimal={viewMode === 'minimal'} />
                {/each}
              </div>
            {:else if $leaderboardQuery.isLoading && entries.length === 0}
              {@const colCount =
                viewMode === 'categories' ? categoryGroups.length : challenges.length}
              <div class="flex flex-col gap-1">
                {#each Array(PAGE_SIZE) as _}
                  <SkeletonRow
                    {showDivision}
                    isMinimal={viewMode === 'minimal'}
                    colCount={viewMode !== 'minimal' ? colCount : 0}
                  />
                {/each}
              </div>
            {:else if entries.length === 0 && !$leaderboardQuery.isLoading}
              <div
                class={cn(
                  'bg-background-l1 rounded-b-3xl',
                  viewMode === 'minimal' ? 'w-full' : 'w-fit min-w-(--team-column-width)'
                )}
              >
                <EmptyState
                  icon={IconMoodWrrrFilled}
                  title="No solves yet"
                  subtitle="The leaderboard will populate as teams solve challenges"
                />
              </div>
            {:else}
              {#each $virtualizer.getVirtualItems() as row (row.index)}
                {#if row.index > entries.length - 1}
                  <div
                    class="absolute top-0 left-0 flex w-full items-center justify-center"
                    style="height: {row.size}px; transform: translateY({row.start -
                      listScrollMargin}px);"
                  >
                    {#if $leaderboardQuery.hasNextPage}
                      <Spinner class="text-foreground-l3 size-5" />
                    {/if}
                  </div>
                {:else if entries[row.index]}
                  {@const entry = entries[row.index]!}
                  {@const rank = row.index + 1}
                  {@const solves = solvesByTeam.get(entry.id)}
                  {@const solveTimes = solvesWithTimeByTeam.get(entry.id)}
                  {@const isYou = currentUser?.id === entry.id}

                  <div
                    class={cn(
                      'bg-background-l1 data-row group absolute top-0 left-0 flex min-w-0 rounded-lg',
                      viewMode === 'minimal' ? 'w-full' : 'w-fit'
                    )}
                    style="height: {row.size}px; transform: translateY({row.start -
                      listScrollMargin}px);"
                  >
                    <ScoresTeamRow
                      id={entry.id}
                      name={entry.name}
                      avatarUrl={entry.avatarUrl}
                      division={entry.division}
                      divisionPlace={entry.divisionPlace}
                      countryCode={entry.countryCode}
                      statusText={entry.statusText}
                      score={entry.score}
                      solveCount={entry.solves.length}
                      {rank}
                      isCurrentUser={isYou}
                      isFullWidth={viewMode === 'minimal'}
                      sparklineData={$virtualizer.isScrolling
                        ? []
                        : (sparklineDataByTeam.get(entry.id) ?? [])}
                      delta={rankDeltaByTeam.get(entry.id)}
                      {showDivision}
                      onHover={() => (hoveredTeamId = entry.id)}
                      onUnhover={() => (hoveredTeamId = null)}
                    />

                    {#if viewMode !== 'minimal'}
                      <ScoresSolveCells
                        teamId={entry.id}
                        {viewMode}
                        {sortMode}
                        isScrolling={$virtualizer.isScrolling}
                        {categoryGroups}
                        {challenges}
                        getSolves={cid => solves?.has(cid) ?? false}
                        getSolveTime={cid => solveTimes?.get(cid)}
                        getCategoryStats={group => getCategoryStats(entry.id, group)}
                        getBloodIndex={cid => getBloodIndex(cid, entry.id)}
                        onCellHover={handleCellHover}
                      />
                    {/if}
                  </div>
                {/if}
              {/each}
            {/if}
          </div>

          {#if showSelfRow && currentUser}
            <div class="bg-background-l0 sticky bottom-0 z-20 mt-4 h-(--self-row-height)">
              <div
                class={cn(
                  'bg-background-l1 data-row group flex min-w-0 rounded-lg',
                  viewMode === 'minimal' ? 'w-full' : 'w-fit'
                )}
              >
                <ScoresTeamRow
                  id={currentUser.id}
                  name={currentUser.name}
                  avatarUrl={currentUser.avatarUrl}
                  division={currentUser.division}
                  divisionPlace={currentUser.divisionPlace}
                  countryCode={currentUser.countryCode}
                  statusText={currentUser.statusText}
                  score={currentUser.score}
                  solveCount={currentUser.solves.length}
                  rank={currentUser.globalPlace ?? 0}
                  isCurrentUser={true}
                  isFullWidth={viewMode === 'minimal'}
                  sparklineData={$virtualizer.isScrolling
                    ? []
                    : (sparklineDataByTeam.get(currentUser.id) ?? [])}
                  delta={rankDeltaByTeam.get(currentUser.id)}
                  {showDivision}
                  onHover={() => (hoveredTeamId = currentUser.id)}
                  onUnhover={() => (hoveredTeamId = null)}
                />

                {#if viewMode !== 'minimal'}
                  <ScoresSolveCells
                    teamId={currentUser.id}
                    {viewMode}
                    {sortMode}
                    isScrolling={$virtualizer.isScrolling}
                    {categoryGroups}
                    {challenges}
                    getSolves={cid => currentUser.solves.some(s => s.id === cid)}
                    getSolveTime={cid => currentUser.solves.find(s => s.id === cid)?.createdAt}
                    getCategoryStats={group => getCategoryStats(currentUser.id, group)}
                    getBloodIndex={cid => getBloodIndex(cid, currentUser.id)}
                    onCellHover={handleCellHover}
                  />
                {/if}
              </div>
            </div>
          {/if}
        </ScrollArea>
      </div>
    </div>
  </div>
{:else}
  <ScoresMobile
    {entries}
    {graphData}
    {currentUser}
    {showSelfRow}
    {rankDeltaByTeam}
    isFetching={$leaderboardQuery.isFetching}
    isFetchingNextPage={$leaderboardQuery.isFetchingNextPage}
    isLoading={$leaderboardQuery.isLoading}
    hasNextPage={$leaderboardQuery.hasNextPage}
    {hoveredTeamId}
    {solveHighlight}
    {showTop3Context}
    {showDivision}
    {total}
    onLoadMore={() => $leaderboardQuery.fetchNextPage()}
  />
{/if}

{#if tooltipData}
  <ScoresSolveTooltip data={tooltipData} x={tooltipX} y={tooltipY} />
{/if}

<style>
  .scoreboard {
    --team-column-width: 45vw;
    --header-height: 12rem;
    --name-row-height: 8rem;
    --self-row-height: 4rem;
    --diagonal-overflow: 5rem;
  }

  @media (max-width: 768px) {
    .scoreboard {
      --team-column-width: 100%;
    }
  }

  @media (min-width: 769px) and (max-width: 1280px) {
    .scoreboard {
      --team-column-width: 50vw;
    }
  }

  :global(.col-team) {
    width: var(--team-column-width);
    overflow: hidden;
  }
</style>
