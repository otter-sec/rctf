<script lang="ts">
  import { goto } from '$app/navigation'
  import { page as pageState } from '$app/state'
  import { onMount } from 'svelte'
  import {
    ApiError,
    useClientConfig,
    useCurrentUser,
    useInfiniteLeaderboard,
    useLeaderboardChallenges,
    useSelfUserGraph,
    useTopGraphData,
  } from '$lib/query'
  import { getCategoryConfig, getScoreboardCategoryOrder } from '$lib/utils/categories'
  import { CtfNotStarted } from '$lib/components'
  import { CUTOFF_TIME, DELTA_WINDOW, SPARKLINE_WINDOW } from './constants'
  import ScoresDesktop from './scores-desktop.svelte'
  import ScoresMobile from './scores-mobile.svelte'
  import ScoresSolveTooltip from './scores-solve-tooltip.svelte'
  import type { CategoryGroup, ChallengeInfo, SortMode, TooltipData, ViewMode } from './types'

  const STORAGE_KEY = 'rctf:scores:preferences'

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

  let isDesktop = $state(true)

  onMount(() => {
    const mql = window.matchMedia('(min-width: 768px)')
    const update = () => (isDesktop = mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
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

  function handleHoverTeam(id: string | null) {
    hoveredTeamId = id
  }
</script>

{#if isNotStarted}
  <CtfNotStarted />
{:else if isDesktop}
  <ScoresDesktop
    {viewMode}
    {sortMode}
    {entries}
    {total}
    {graphData}
    {categoryGroups}
    {challenges}
    {currentUser}
    {showSelfRow}
    {showDivision}
    {showTop3Context}
    {solvesByTeam}
    {solvesWithTimeByTeam}
    {sparklineDataByTeam}
    {rankDeltaByTeam}
    {challengesData}
    isFetching={$leaderboardQuery.isFetching}
    isLoading={$leaderboardQuery.isLoading}
    isFetchingNextPage={$leaderboardQuery.isFetchingNextPage}
    hasNextPage={$leaderboardQuery.hasNextPage}
    challengesLoading={$challengesQuery.isLoading}
    {hoveredTeamId}
    {solveHighlight}
    onViewModeChange={setViewMode}
    onSortModeChange={setSortMode}
    onShowTop3ContextChange={setShowTop3Context}
    onHoverTeam={handleHoverTeam}
    onCellHover={handleCellHover}
    onLoadMore={() => $leaderboardQuery.fetchNextPage()}
  />
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
