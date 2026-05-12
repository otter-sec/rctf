<script lang="ts">
  import { goto } from '$app/navigation'
  import { page as pageState } from '$app/state'
  import { CtfNotStarted, EmptyState, ScrollArea, Spinner, Tooltip } from '$lib/components'
  import { CUTOFF_TIME, DELTA_WINDOW, SELF_COLOR, SPARKLINE_WINDOW } from '$lib/constants/scores'
  import { IconChartAreaLineFilled, IconFlagFilled } from '$lib/icons'
  import {
    ApiError,
    useClientConfig,
    useCurrentUser,
    useInfiniteLeaderboardWithGraph,
    useLeaderboardChallenges,
    useSelfUserGraph,
  } from '$lib/query'
  import {
    cn,
    getRankColorForPosition,
    useInfiniteVirtualScroll,
    type ScrollMetrics,
  } from '$lib/utils'
  import {
    getCategoryConfig,
    getCategoryKeyOrAlias,
    getScoreboardCategoryOrder,
  } from '$lib/utils/categories'
  import { onMount } from 'svelte'
  import ScoresCellTooltipContent from './scores-cell-tooltip-content.svelte'
  import ScoresChallengeHeader from './scores-challenge-header.svelte'
  import ScoresFades from './scores-fades.svelte'
  import ScoresGraph from './scores-graph.svelte'
  import ScoresGraphControls from './scores-graph-controls.svelte'
  import ScoresScreenshotModal from './scores-screenshot-modal.svelte'
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

  interface ScoresPreferences {
    viewMode: ViewMode
    sortMode: SortMode
    showTop3Context: boolean
    showSelfContext: boolean
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
    } catch {}
  }

  const savedPrefs = loadPreferences()
  let hasInteracted = $state(false)

  const viewMode = $derived.by((): ViewMode => {
    const v = pageState.url.searchParams.get('view')
    if (v === 'challenges' || v === 'categories') return v
    if (!hasInteracted && savedPrefs.viewMode) return savedPrefs.viewMode
    return 'challenges'
  })

  const sortMode = $derived.by((): SortMode => {
    const s = pageState.url.searchParams.get('sort')
    if (s === 'solves') return 'solves'
    if (!hasInteracted && savedPrefs.sortMode) return savedPrefs.sortMode
    return 'categories'
  })

  let showTop3Context = $state(savedPrefs.showTop3Context ?? true)
  let showSelfContext = $state(savedPrefs.showSelfContext ?? true)

  const clientConfigQuery = useClientConfig()

  const divisions = $derived(clientConfigQuery.data?.divisions ?? {})

  const division = $derived.by((): string | undefined => {
    const d = pageState.url.searchParams.get('division')
    if (d && divisions[d]) return d
    return undefined
  })

  let searchInput = $state(pageState.url.searchParams.get('search') ?? '')

  const _initialSearch = pageState.url.searchParams.get('search')
  let search = $state<string | undefined>(
    _initialSearch && _initialSearch.length >= 2 ? _initialSearch : undefined
  )

  $effect(() => {
    const raw = searchInput
    const timer = setTimeout(() => {
      search = raw.length >= 2 ? raw : undefined
      const url = new URL(window.location.href)
      if (raw.length >= 2) {
        url.searchParams.set('search', raw)
      } else {
        url.searchParams.delete('search')
      }
      history.replaceState(history.state, '', url.toString())
    }, 400)
    return () => clearTimeout(timer)
  })

  function setDivision(d: string | undefined) {
    const url = new URL(pageState.url)
    if (d) url.searchParams.set('division', d)
    else url.searchParams.delete('division')
    goto(url, { replaceState: true, keepFocus: true, noScroll: true })
  }

  function setViewMode(v: ViewMode) {
    hasInteracted = true
    savePreferences({ viewMode: v })
    const url = new URL(pageState.url)
    if (v === 'challenges') url.searchParams.delete('view')
    else url.searchParams.set('view', v)
    url.searchParams.delete('challenge')
    goto(url, { replaceState: true, keepFocus: true, noScroll: true })
  }

  function setSortMode(s: SortMode) {
    hasInteracted = true
    savePreferences({ sortMode: s })
    const url = new URL(pageState.url)
    if (s === 'categories') url.searchParams.delete('sort')
    else url.searchParams.set('sort', s)
    url.searchParams.delete('challenge')
    goto(url, { replaceState: true, keepFocus: true, noScroll: true })
  }

  function setShowTop3Context(v: boolean) {
    savePreferences({ showTop3Context: v })
    showTop3Context = v
  }

  function setShowSelfContext(v: boolean) {
    savePreferences({ showSelfContext: v })
    showSelfContext = v
  }

  let themeRenderEpoch = $state(0)
  let isDesktop = $state(true)
  let isXl = $state(true)

  onMount(() => {
    const mqlDesktop = window.matchMedia('(min-width: 768px)')
    const mqlXl = window.matchMedia('(min-width: 1280px)')
    const root = document.documentElement

    const updateDesktop = () => (isDesktop = mqlDesktop.matches)
    const updateXl = () => (isXl = mqlXl.matches)

    updateDesktop()
    updateXl()

    mqlDesktop.addEventListener('change', updateDesktop)
    mqlXl.addEventListener('change', updateXl)

    const themeObserver = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          themeRenderEpoch = Date.now()
          break
        }
      }
    })
    themeObserver.observe(root, { attributes: true, attributeFilter: ['data-theme'] })

    return () => {
      mqlDesktop.removeEventListener('change', updateDesktop)
      mqlXl.removeEventListener('change', updateXl)
      themeObserver.disconnect()
    }
  })

  const leaderboardQuery = useInfiniteLeaderboardWithGraph(() => ({
    pageSize: LEADERBOARD_PAGE_SIZE,
    division,
    search,
  }))
  const challengesQuery = useLeaderboardChallenges()
  const userQuery = useCurrentUser()

  let screenshotModalOpen = $state(false)
  const focusedChallengeId = $derived(pageState.url.searchParams.get('challenge') ?? null)

  function setFocusedChallenge(id: string | null) {
    const url = new URL(pageState.url)
    if (id) url.searchParams.set('challenge', id)
    else url.searchParams.delete('challenge')
    goto(url, { replaceState: true, keepFocus: true, noScroll: true })
  }

  const rawEntries = $derived(leaderboardQuery.data?.pages.flatMap(p => p.leaderboard) ?? [])
  type LeaderboardEntry = (typeof rawEntries)[number]
  const originalRankByTeam = $derived(new Map(rawEntries.map((e, i) => [e.id, i + 1])))

  const teamColorMap = $derived.by(() => {
    const map = new Map<string, string>()
    for (const entry of rawEntries) {
      map.set(
        entry.id,
        getRankColorForPosition(entry.globalPlace, currentUser?.id === entry.id, entry.id)
      )
    }
    if (currentUser) map.set(currentUser.id, SELF_COLOR)
    return map
  })

  $effect(() => {
    if (
      focusedChallengeId &&
      leaderboardQuery.hasNextPage &&
      !leaderboardQuery.isFetchingNextPage
    ) {
      leaderboardQuery.fetchNextPage()
    }
  })

  const entries = $derived.by((): LeaderboardEntry[] => {
    if (!focusedChallengeId) return rawEntries

    return rawEntries
      .filter(e => e.solves.some(s => s.id === focusedChallengeId))
      .sort((a, b) => {
        const aTime = a.solves.find(s => s.id === focusedChallengeId)?.solveTime ?? Infinity
        const bTime = b.solves.find(s => s.id === focusedChallengeId)?.solveTime ?? Infinity
        return aTime - bTime
      })
  })
  const allGraphData = $derived(leaderboardQuery.data?.pages.flatMap(p => p.graph) ?? [])
  const total = $derived(leaderboardQuery.data?.pages[0]?.total ?? 0)

  const currentUser = $derived(userQuery.data)
  const challengesData = $derived(challengesQuery.data ?? {})

  const mergeWithSelfGraph = <T extends { id: string }>(
    data: T[],
    selfData: T | null | undefined
  ): T[] => (selfData && !data.some(t => t.id === selfData.id) ? [...data, selfData] : data)

  const isNotStarted = $derived(ApiError.isNotStarted(leaderboardQuery.error))
  const isLoading = $derived(leaderboardQuery.isLoading || challengesQuery.isLoading)
  const showDivision = $derived(
    clientConfigQuery.data ? Object.keys(clientConfigQuery.data.divisions).length > 1 : false
  )
  const renderEpoch = $derived(
    Math.max(
      leaderboardQuery.dataUpdatedAt ?? 0,
      challengesQuery.dataUpdatedAt ?? 0,
      userQuery.dataUpdatedAt ?? 0,
      themeRenderEpoch
    )
  )

  const challengesByCategory = $derived<ChallengeInfo[]>(
    Object.entries(challengesData)
      .map(([id, info]) => ({
        id,
        ...info,
        order: getScoreboardCategoryOrder(info.category),
        config: getCategoryConfig(info.category),
      }))
      .filter(c => getCategoryKeyOrAlias(c.category) !== 'sanity')
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

  let listScrollMargin = $state(0)

  let showTopFade = $state(false)
  let showBottomFade = $state(false)
  let showLeftFade = $state(false)
  let showRightFade = $state(false)
  let scrollMetrics = $state<ScrollMetrics | null>(null)

  function updateFades(metrics: ScrollMetrics) {
    scrollMetrics = metrics

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

  const scroll = useInfiniteVirtualScroll({
    rowHeight: ROW_HEIGHT,
    overscan: 10,
    isScrollingResetDelay: 100,
    onLoadMore: () => leaderboardQuery.fetchNextPage(),
    onScroll: updateFades,
  })

  const userEntryIndex = $derived(
    currentUser ? entries.findIndex(e => e.id === currentUser.id) : -1
  )

  const viewportVisibility = $derived.by(() => {
    const metrics = scrollMetrics
    let minRank = Infinity
    let maxRank = 0
    let visibleCount = 0

    if (metrics && entries.length > 0) {
      const viewportTop = metrics.scrollTop
      const viewportBottom = viewportTop + metrics.clientHeight
      const headerOffset = listScrollMargin

      for (const item of scroll.virtualItems) {
        if (item.index >= entries.length) continue

        const itemTop = item.start
        const itemBottom = item.start + item.size

        const isInViewport = itemBottom > viewportTop + headerOffset && itemTop < viewportBottom
        if (isInViewport) {
          const rank = item.index + 1
          if (rank < minRank) minRank = rank
          if (rank > maxRank) maxRank = rank
          visibleCount++
        }
      }
    }

    let userVisible = false
    let userClippedTop = false
    if (userEntryIndex !== -1 && metrics) {
      const userItem = scroll.virtualItems.find(item => item.index === userEntryIndex)
      if (userItem) {
        const vTop = metrics.scrollTop + listScrollMargin
        const vBottom = metrics.scrollTop + metrics.clientHeight
        const itemTop = userItem.start
        const itemBottom = userItem.start + userItem.size
        userVisible = itemTop >= vTop && itemBottom <= vBottom
        userClippedTop = itemTop < vTop
      }
    }

    return {
      minRank: visibleCount > 0 ? minRank : 0,
      maxRank: visibleCount > 0 ? maxRank : 0,
      userVisible,
      userClippedTop,
    }
  })

  const showSelfRow = $derived.by(() => {
    if (search) return false
    if (isLoading && currentUser) return true
    if (!currentUser?.globalPlace) return false
    if (viewportVisibility.userVisible) return false
    return true
  })

  const selfRowPosition = $derived.by((): 'top' | 'bottom' => {
    if (!currentUser?.globalPlace) return 'bottom'
    if (userEntryIndex === -1) return 'bottom'
    if (viewportVisibility.userClippedTop) return 'top'
    const userItem = scroll.virtualItems.find(item => item.index === userEntryIndex)
    if (!userItem) {
      return viewportVisibility.minRank > userEntryIndex + 1 ? 'top' : 'bottom'
    }
    return 'bottom'
  })

  const selfGraphQuery = useSelfUserGraph(() =>
    showSelfRow && currentUser?.globalPlace ? currentUser.globalPlace : null
  )

  const sparklineDataByTeam = $derived.by(() => {
    const filterPoints = (points: { time: number; score: number }[], minTime = 0) =>
      points.filter(p => p.time >= minTime && p.time <= CUTOFF_TIME)

    const allTeams = mergeWithSelfGraph(allGraphData, selfGraphQuery.data)
    let maxTime = 0
    for (const t of allTeams) {
      for (const p of filterPoints(t.points)) {
        if (p.time > maxTime) maxTime = p.time
      }
    }
    const windowStart = maxTime - SPARKLINE_WINDOW

    return new Map(allTeams.map(team => [team.id, filterPoints(team.points, windowStart)]))
  })

  const rankDeltaByTeam = $derived.by(() => {
    if (search) return new Map<string, number>()
    const allPoints = allGraphData.flatMap(t => t.points.filter(p => p.time <= CUTOFF_TIME))
    if (allPoints.length === 0) return new Map<string, number>()

    let maxDataTime = -Infinity
    for (const p of allPoints) {
      if (p.time > maxDataTime) maxDataTime = p.time
    }
    const currentTime = Math.min(maxDataTime, CUTOFF_TIME)
    const pastTime = currentTime - DELTA_WINDOW

    const getLatestScore = (points: { time: number; score: number }[], targetTime: number) => {
      const valid = points.filter(p => p.time <= targetTime)
      if (!valid.length) return 0
      return valid.reduce((latest, p) => (p.time > latest.time ? p : latest)).score
    }

    const allTeams = mergeWithSelfGraph(allGraphData, selfGraphQuery.data)
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

  let hoveredTeamId = $state<string | null>(null)
  let solveHighlight = $state<{ teamId: string; time: number } | null>(null)

  let cellTooltipData = $state<TooltipData | null>(null)
  let cellTooltipOpen = $state(false)
  let cellTooltipAnchorRect = $state({ x: 0, y: 0 })

  const cellTooltipTether = Tooltip.createTether<TooltipData>()

  const cellTooltipAnchor = {
    getBoundingClientRect: () => ({
      x: cellTooltipAnchorRect.x,
      y: cellTooltipAnchorRect.y,
      top: cellTooltipAnchorRect.y,
      left: cellTooltipAnchorRect.x,
      bottom: cellTooltipAnchorRect.y,
      right: cellTooltipAnchorRect.x,
      width: 0,
      height: 0,
      toJSON: () => ({}),
    }),
  }

  function handleCellHover(data: TooltipData | null, x: number, y: number) {
    cellTooltipData = data

    if (!data) {
      return
    }

    cellTooltipAnchorRect = { x, y }
  }

  function clearCellTooltip() {
    cellTooltipData = null
    cellTooltipTether.close()
  }

  $effect(() => {
    if (!cellTooltipOpen || !cellTooltipData) {
      hoveredTeamId = null
      solveHighlight = null
      return
    }

    if (cellTooltipData.type === 'challenge' && !cellTooltipData.solved) {
      hoveredTeamId = null
      solveHighlight = null
      return
    }

    hoveredTeamId = cellTooltipData.teamId
    solveHighlight =
      cellTooltipData.type === 'challenge' && cellTooltipData.solveTime
        ? { teamId: cellTooltipData.teamId, time: cellTooltipData.solveTime }
        : null
  })

  $effect(() => {
    if (scroll.isScrolling) {
      clearCellTooltip()
    }
  })

  let headerRowRef = $state<HTMLElement | null>(null)

  let fadeRaf = 0
  function updateFadesFromViewport() {
    if (fadeRaf) return
    fadeRaf = requestAnimationFrame(() => {
      fadeRaf = 0
      const viewport = scroll.state.viewportRef
      if (!viewport?.isConnected) return
      updateFades({
        scrollTop: viewport.scrollTop,
        scrollLeft: viewport.scrollLeft,
        scrollHeight: viewport.scrollHeight,
        scrollWidth: viewport.scrollWidth,
        clientHeight: viewport.clientHeight,
        clientWidth: viewport.clientWidth,
      })
    })
  }

  const contentWidth = $derived.by(() => {
    const cellCount = viewMode === 'categories' ? categoryGroups.length : challenges.length
    return cellCount * (CELL_WIDTH + ROW_GAP) + DIAGONAL_OVERFLOW
  })

  const teamRanks = $derived(
    !search && focusedChallengeId
      ? originalRankByTeam
      : new Map(entries.map((e, i) => [e.id, i + 1]))
  )

  const graphVisibility = $derived.by(() => {
    if (isLoading || entries.length === 0) {
      return { visibleTeamIds: new Set<string>(), contextTeamIds: new Set<string>() }
    }

    const { minRank, maxRank } = viewportVisibility
    const visibleTeamIds = new Set<string>()
    const contextTeamIds = new Set<string>()

    if (maxRank <= 10) {
      for (let i = 0; i < Math.min(10, entries.length); i++) {
        visibleTeamIds.add(entries[i]!.id)
      }
    } else {
      if (showTop3Context && !focusedChallengeId) {
        for (let i = 0; i < Math.min(3, entries.length); i++) {
          const teamId = entries[i]!.id
          visibleTeamIds.add(teamId)
          if (i + 1 < minRank) {
            contextTeamIds.add(teamId)
          }
        }
      }

      const pinActive = showTop3Context && !focusedChallengeId
      const windowSize = pinActive ? 7 : 10
      const windowStart = Math.max(pinActive ? 4 : 1, maxRank - windowSize + 1)
      const windowEnd = maxRank

      for (let rank = windowStart; rank <= windowEnd && rank <= entries.length; rank++) {
        visibleTeamIds.add(entries[rank - 1]!.id)
      }
    }

    if (showSelfRow && currentUser) {
      const selfRank = teamRanks.get(currentUser.id)
      const selfInTop3 = selfRank !== undefined && selfRank <= 3
      if (!selfInTop3 || showTop3Context) {
        visibleTeamIds.add(currentUser.id)
      }
    }

    return { visibleTeamIds, contextTeamIds }
  })

  let stableGraphVisibility = $state({
    visibleTeamIds: new Set<string>(),
    contextTeamIds: new Set<string>(),
  })

  $effect(() => {
    const current = graphVisibility
    if (!scroll.isScrolling) {
      stableGraphVisibility = current
    }
  })

  const visibleGraphData = $derived(
    allGraphData.filter(team => stableGraphVisibility.visibleTeamIds.has(team.id))
  )

  const contextTeamIds = $derived(stableGraphVisibility.contextTeamIds)

  const graphProps = $derived({
    hoveredTeamId,
    offset: 0,
    solveHighlight,
    graphData: visibleGraphData,
    teamRanks,
    teamColors: teamColorMap,
    contextTeamIds,
    showTop3Context,
    showSelfContext,
    forceContextTeams: (!!search || !!focusedChallengeId) && showTop3Context,
  })

  const teamRowProps = $derived({
    contentWidth,
    viewMode,
    sortMode,
    categoryGroups,
    challenges,
    focusedChallengeId,
    themeEpoch: themeRenderEpoch,
    renderEpoch,
    isScrolling: scroll.isScrolling,
    isDesktop,
    cellTooltipTether,
    onCellHover: handleCellHover,
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

  const scrollbarYPadding = $derived.by(() => {
    const isSelfTop = showSelfRow && selfRowPosition === 'top'
    const selfRowPb = 'pb-[calc(var(--row-height-full)+4px)]'
    const selfRowPt = isDesktop
      ? 'pt-[calc(var(--header-height)+var(--row-height-full)+4px)]'
      : 'pt-[calc(var(--row-height-full)+4px)]'

    if (isSelfTop) return `${selfRowPt} pb-1`
    if (showSelfRow) return `${isDesktop ? 'pt-(--header-height)' : ''} ${selfRowPb}`
    return `${isDesktop ? 'pt-(--header-height)' : ''} pb-1`
  })

  const fadeDeps = $derived({
    contentWidth,
    listScrollMargin,
    showSelfRow,
    selfRowPosition,
    isDesktop,
    isLoading,
    focusedChallengeId,
    entryCount: entries.length,
  })

  $effect(() => {
    const viewport = scroll.state.viewportRef
    if (!viewport) return

    fadeDeps

    updateFadesFromViewport()

    const ro = new ResizeObserver(() => updateFadesFromViewport())
    ro.observe(viewport, { box: 'border-box' })
    const content = viewport.firstElementChild
    if (content) ro.observe(content, { box: 'border-box' })

    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => updateFadesFromViewport())
    })

    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf1)
      if (raf2) cancelAnimationFrame(raf2)
      if (fadeRaf) {
        cancelAnimationFrame(fadeRaf)
        fadeRaf = 0
      }
    }
  })

  $effect.pre(() => {
    const visibleCount = isLoading ? 0 : entries.length
    const totalCount = isLoading
      ? 0
      : focusedChallengeId
        ? entries.length
        : Math.max(total, entries.length)

    scroll.state.count = totalCount
    scroll.state.loadMoreCount = visibleCount
    scroll.state.hasNextPage = isLoading
      ? false
      : focusedChallengeId
        ? false
        : leaderboardQuery.hasNextPage
    scroll.state.isFetching = isLoading || leaderboardQuery.isFetchingNextPage
    scroll.state.scrollMargin = listScrollMargin
  })

  const screenshotTeams = $derived(
    entries.map((entry, index) => ({
      id: entry.id,
      rank: index + 1,
      name: entry.name,
      avatarUrl: entry.avatarUrl,
      countryCode: entry.countryCode,
      statusText: entry.statusText,
      score: entry.score,
      solveCount: entry.solves.length,
      isCurrentUser: currentUser?.id === entry.id,
      color: teamColorMap.get(entry.id),
      sparklineData: sparklineDataByTeam.get(entry.id),
    }))
  )

  const screenshotSelfTeam = $derived.by(() => {
    if (!currentUser) return null
    return {
      id: currentUser.id,
      rank: currentUser.globalPlace ?? 0,
      name: currentUser.name,
      avatarUrl: currentUser.avatarUrl,
      countryCode: currentUser.countryCode,
      statusText: currentUser.statusText,
      score: currentUser.score,
      solveCount: currentUser.solves.length,
      isCurrentUser: true,
      color: SELF_COLOR,
      sparklineData: sparklineDataByTeam.get(currentUser.id),
    }
  })

  const screenshotGraphData = $derived(
    allGraphData.map(team => ({
      id: team.id,
      name: team.name,
      points: team.points,
    }))
  )
</script>

<Tooltip.Provider delayDuration={300} skipDelayDuration={600} disableHoverableContent>
{#if leaderboardQuery.isPending && !search}
  <div class="flex flex-1 items-center justify-center">
    <Spinner class="size-4" />
  </div>
{:else if isNotStarted}
  <CtfNotStarted />
{:else}
  <ScoresToolbar
    {viewMode}
    {sortMode}
    {total}
    loadedCount={entries.length}
    {divisions}
    {division}
    focusedChallenge={focusedChallengeId && challengesData[focusedChallengeId]
      ? {
          id: focusedChallengeId,
          name: challengesData[focusedChallengeId].name,
          icon: getCategoryConfig(challengesData[focusedChallengeId].category).icon,
          color: getCategoryConfig(challengesData[focusedChallengeId].category).color,
        }
      : null}
    search={searchInput}
    isSearching={leaderboardQuery.isFetching && !!search}
    onViewModeChange={setViewMode}
    onSortModeChange={setSortMode}
    onDivisionChange={setDivision}
    onScreenshotClick={() => (screenshotModalOpen = true)}
    onChallengeFocusClear={() => setFocusedChallenge(null)}
    onSearchChange={v => (searchInput = v)}
  />

  {#if !isLoading && entries.length === 0 && focusedChallengeId}
    <!-- mobile: 72px (nav) + 96px (toolbar) + 192px (graph) + 8px (mb-2) = 368px -->
    <!-- desktop: 72px (nav) + 52px (toolbar) + 192px (header) = 316px -->
    <div
      class="bg-background-l0 fixed inset-x-0 top-[368px] bottom-0 z-50 flex items-center justify-center md:top-[316px]"
    >
      <EmptyState
        icon={IconFlagFilled}
        title="No solves"
        subtitle="No matching teams have solved this challenge"
      />
    </div>
  {/if}

  {#if !isLoading && entries.length === 0 && !focusedChallengeId}
    <div
      class="flex h-[calc(100dvh-72px-96px)] items-center justify-center md:h-[calc(100dvh-72px-52px)]"
    >
      <EmptyState
        icon={IconChartAreaLineFilled}
        title={search ? 'No teams found' : 'No scores yet'}
        subtitle={search ? `No results for "${search}"` : 'Check back soon for scores!'}
      />
    </div>
  {:else}
    <div class="flex justify-center px-4 md:px-9">
      <div
        class="relative w-full max-w-full md:w-fit"
        style:--row-height="{ROW_HEIGHT - ROW_GAP}px"
        style:--row-height-full="{ROW_HEIGHT}px"
        style:--cell-width="{CELL_WIDTH}px"
        style:--header-height="{HEADER_HEIGHT}px"
        style:--name-row-height="128px"
        style:--diagonal-overflow="96px"
        style:--team-column-width={isDesktop
          ? isXl
            ? 'calc(45vw - 72px)'
            : 'calc(60vw - 72px)'
          : '100%'}
        style:--content-column-width={isDesktop
          ? isXl
            ? 'calc(55vw + 72px)'
            : 'calc(40vw + 72px)'
          : '0px'}
        style:--self-row-height="{ROW_HEIGHT}px"
        style:--self-row-offset={showSelfRow && selfRowPosition === 'bottom'
          ? `${ROW_HEIGHT}px`
          : '0px'}
        style:--self-row-top-offset={showSelfRow && selfRowPosition === 'top'
          ? `${ROW_HEIGHT}px`
          : '0px'}
        style:--score-scroll-padding-top={showSelfRow && selfRowPosition === 'top'
          ? isDesktop
            ? 'calc(var(--header-height) + var(--row-height-full) + 4px)'
            : 'calc(var(--row-height-full) + 4px)'
          : isDesktop
            ? 'var(--header-height)'
            : '0px'}
      >
        <ScoresFades
          showTop={showTopFade}
          showBottom={showBottomFade}
          showLeft={isDesktop && showLeftFade}
          showRight={isDesktop && showRightFade}
          {showSelfRow}
          {selfRowPosition}
          isMinimal={!isDesktop}
        />

        <div
          class="group/graph bg-background-l1 relative mb-2 h-(--header-height) rounded-lg md:hidden"
        >
          <ScoresGraphControls
            {showTop3Context}
            {showSelfContext}
            onShowTop3ContextChange={setShowTop3Context}
            onShowSelfContextChange={setShowSelfContext}
          />
          <ScoresGraph class="h-full w-full p-3" {...graphProps} />
        </div>

        <!-- 100dvh - 72px (header) - 52px (toolbar) - 16px (bottom gap) -->
        <!-- 100dvh - 72px (header) - 96px (toolbar, mobile 2-row) - 8px (between graph and rows) - 192px (graph height) - 16px (bottom gap) -->
        <ScrollArea
          class={isDesktop
            ? 'h-[calc(100dvh-72px-52px-16px)]'
            : 'h-[calc(100dvh-72px-96px-8px-192px-16px)]'}
          orientation={isDesktop ? 'both' : 'vertical'}
          type={isDesktop ? 'always' : 'auto'}
          fadeSize={0}
          bind:viewportRef={scroll.state.viewportRef}
          viewportTabIndex={-1}
          viewportClass={cn(
            'scroll-pt-(--score-scroll-padding-top)',
            isDesktop && 'scroll-pl-(--team-column-width)'
          )}
          scrollbarXClasses={isDesktop ? 'pl-(--team-column-width) -mr-[10px] z-40' : 'hidden'}
          scrollbarYClasses={`z-40 ${scrollbarYPadding}`}
        >
          <div class="flex min-h-full flex-col">
            <div
              class="bg-background-l0 sticky top-0 z-20 hidden h-(--header-height) md:flex"
              bind:this={headerRowRef}
            >
              <div
                class="group/graph bg-background-l0 sticky left-0 z-30 w-(--team-column-width) shrink-0"
              >
                <div class="bg-background-l1 h-full w-full rounded-t-3xl rounded-bl-xl">
                  <ScoresGraphControls
                    {showTop3Context}
                    {showSelfContext}
                    onShowTop3ContextChange={setShowTop3Context}
                    onShowSelfContextChange={setShowSelfContext}
                  />
                  <ScoresGraph class="h-full w-full p-3" {...graphProps} />
                </div>
              </div>
              {#if !challengesQuery.isLoading}
                <ScoresChallengeHeader
                  {viewMode}
                  {sortMode}
                  {categoryGroups}
                  {challenges}
                  {focusedChallengeId}
                  onChallengeFocus={id => {
                    const wasFocused = focusedChallengeId === id
                    setFocusedChallenge(wasFocused ? null : id)
                    if (!wasFocused) {
                      const viewport = scroll.state.viewportRef
                      if (viewport) viewport.scrollTop = 0
                    }
                  }}
                />
              {/if}
            </div>

            <div
              class="relative contain-[layout_style]"
              style:height={isLoading ? `${10 * ROW_HEIGHT}px` : `${scroll.totalSize}px`}
              style:width={isDesktop
                ? `calc(var(--team-column-width) + ${contentWidth}px)`
                : '100%'}
            >
              {#if isLoading}
                {#each Array(10) as _, i}
                  <div
                    class="absolute top-0 left-0 flex h-(--row-height-full) w-full contain-[layout_style_paint] md:w-auto"
                    style:transform="translate3d(0, {i * ROW_HEIGHT}px, 0)"
                  >
                    <ScoresTeamRow
                      data={null}
                      solves={null}
                      solveTimes={null}
                      isLoading
                      {...teamRowProps}
                      getCategoryStats={group => getCategoryStatsForSolves(null, group)}
                      getBloodIndex={() => -1}
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
                      class="absolute top-0 left-0 flex w-full contain-[layout_style_paint] md:w-auto"
                      style:height="{row.size}px"
                      style:transform="translate3d(0, {row.start - listScrollMargin}px, 0)"
                    >
                      <ScoresTeamRow
                        data={{
                          id: entry.id,
                          rank:
                            !search && focusedChallengeId
                              ? (originalRankByTeam.get(entry.id) ?? row.index + 1)
                              : (entry.globalPlace ?? row.index + 1),
                          globalRank: entry.globalPlace,
                          name: entry.name,
                          avatarUrl: entry.avatarUrl,
                          countryCode: entry.countryCode,
                          statusText: entry.statusText,
                          score: entry.score,
                          solveCount: entry.solves.length,
                          delta: rankDeltaByTeam.get(entry.id),
                          sparklineData: sparklineDataByTeam.get(entry.id),
                          isCurrentUser: currentUser?.id === entry.id,
                          color: teamColorMap.get(entry.id),
                          divisionPlace: showDivision ? entry.divisionPlace : undefined,
                          divisionName: showDivision ? divisions[entry.division] : undefined,
                        }}
                        {solves}
                        {solveTimes}
                        {...teamRowProps}
                        getCategoryStats={group => getCategoryStatsForSolves(solves, group)}
                        getBloodIndex={cid => getBloodIndex(cid, entry.id)}
                        onSparklineHover={() => (hoveredTeamId = entry.id)}
                        onSparklineUnhover={() => (hoveredTeamId = null)}
                      />
                    </div>
                  {:else}
                    <div
                      class="absolute top-0 left-0 flex h-(--row-height-full) w-full contain-[layout_style_paint] md:w-auto"
                      style:transform="translate3d(0, {row.start - listScrollMargin}px, 0)"
                    >
                      <ScoresTeamRow
                        data={null}
                        solves={null}
                        solveTimes={null}
                        isLoading
                        {...teamRowProps}
                        getCategoryStats={group => getCategoryStatsForSolves(null, group)}
                        getBloodIndex={() => -1}
                        onSparklineHover={() => {}}
                        onSparklineUnhover={() => {}}
                      />
                    </div>
                  {/if}
                {/each}
              {/if}
            </div>

            {#if showSelfRow && currentUser}
              {@const selfSolves = new Set(currentUser.solves.map(s => s.id))}
              {@const selfSolveTimes = new Map(currentUser.solves.map(s => [s.id, s.createdAt]))}
              {@const isTop = selfRowPosition === 'top'}
              <div
                class={cn(
                  'bg-background-l0 sticky z-20 flex h-(--row-height-full) contain-[layout_style_paint]',
                  isTop ? 'pb-1' : 'bottom-0 mt-auto pt-1'
                )}
                style:top={isTop ? `${listScrollMargin}px` : undefined}
                style:order={isTop ? '-1' : undefined}
                style:margin-bottom={isTop ? `-${ROW_HEIGHT}px` : undefined}
              >
                <ScoresTeamRow
                  data={{
                    id: currentUser.id,
                    rank: currentUser.globalPlace ?? null,
                    globalRank: currentUser.globalPlace ?? undefined,
                    name: currentUser.name,
                    avatarUrl: currentUser.avatarUrl,
                    countryCode: currentUser.countryCode,
                    statusText: currentUser.statusText,
                    score: currentUser.score,
                    solveCount: currentUser.solves.length,
                    delta: rankDeltaByTeam.get(currentUser.id),
                    sparklineData: sparklineDataByTeam.get(currentUser.id),
                    isCurrentUser: true,
                    color: SELF_COLOR,
                    divisionPlace: showDivision ? currentUser.divisionPlace : undefined,
                    divisionName:
                      showDivision && currentUser.division
                        ? divisions[currentUser.division]
                        : undefined,
                  }}
                  solves={isLoading ? null : selfSolves}
                  solveTimes={isLoading ? null : selfSolveTimes}
                  isSelf
                  {isLoading}
                  {...teamRowProps}
                  getCategoryStats={group => getCategoryStatsForSolves(selfSolves, group)}
                  getBloodIndex={cid => getBloodIndex(cid, currentUser.id)}
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
{/if}

<Tooltip.Provider delayDuration={300} skipDelayDuration={0} disableHoverableContent>
  <Tooltip.Root tether={cellTooltipTether} bind:open={cellTooltipOpen}>
    {#snippet children()}
      {#if cellTooltipData}
        <Tooltip.Content side="top" sideOffset={8} customAnchor={cellTooltipAnchor}>
          <ScoresCellTooltipContent data={cellTooltipData} />
        </Tooltip.Content>
      {/if}
    {/snippet}
  </Tooltip.Root>
</Tooltip.Provider>

<ScoresScreenshotModal
  bind:open={screenshotModalOpen}
  onOpenChange={open => (screenshotModalOpen = open)}
  teams={screenshotTeams}
  selfTeam={screenshotSelfTeam}
  graphData={screenshotGraphData}
  {categoryGroups}
  {solvesByTeam}
  ctfName={clientConfigQuery.data?.ctfName ?? ''}
  startTime={clientConfigQuery.data?.startTime ?? null}
  endTime={clientConfigQuery.data?.endTime ?? null}
/>
</Tooltip.Provider>
