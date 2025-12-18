<script lang="ts">
  import { browser } from '$app/environment'
  import { goto } from '$app/navigation'
  import { page as pageState } from '$app/state'
  import { IconMoodWrrrFilled } from '$lib/icons'
  import { CtfNotStarted, EmptyState, ScrollArea } from '$lib/components'
  import {
    ApiError,
    useClientConfig,
    useCurrentUser,
    useLeaderboardChallenges,
    useLeaderboardWithGraph,
    useSelfUserGraph,
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

  const page = $derived.by(() => {
    const n = parseInt(pageState.url.searchParams.get('page') ?? '1', 10)
    return isNaN(n) || n < 1 ? 1 : n
  })

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

  const leaderboardQuery = $derived(
    useLeaderboardWithGraph({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
  )
  const challengesQuery = $derived(useLeaderboardChallenges())
  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()

  const entries = $derived($leaderboardQuery.data?.leaderboard ?? [])
  const graphData = $derived($leaderboardQuery.data?.graph ?? [])
  const total = $derived($leaderboardQuery.data?.total ?? 0)
  const totalPages = $derived(Math.max(1, Math.ceil(total / PAGE_SIZE)))
  const currentUser = $derived($userQuery.data)
  const challengesData = $derived($challengesQuery.data ?? {})
  const clientConfig = $derived($clientConfigQuery.data)

  const isNotStarted = $derived(ApiError.isNotStarted($leaderboardQuery.error))

  $effect(() => {
    if (!$leaderboardQuery.isLoading && total > 0 && page > totalPages) {
      setParam('page', totalPages, 1)
    }
  })

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
    const rank = currentUser?.globalPlace
    if (!rank) return false
    return rank < (page - 1) * PAGE_SIZE + 1 || rank > page * PAGE_SIZE
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
    showTopFade = v.scrollTop > threshold
    showBottomFade = v.scrollTop + v.clientHeight < v.scrollHeight - threshold
    showLeftFade = v.scrollLeft > threshold
    showRightFade = v.scrollLeft + v.clientWidth < v.scrollWidth - threshold
  }

  $effect(() => {
    const v = viewportRef
    if (!v) return

    updateFades()
    v.addEventListener('scroll', updateFades, { passive: true })
    const observer = new ResizeObserver(updateFades)
    observer.observe(v)

    return () => {
      v.removeEventListener('scroll', updateFades)
      observer.disconnect()
    }
  })
</script>

{#if isNotStarted}
  <CtfNotStarted />
{:else}
  <ScoresMobile
    {entries}
    {graphData}
    {currentUser}
    {page}
    {totalPages}
    {showSelfRow}
    {rankDeltaByTeam}
    isFetching={$leaderboardQuery.isFetching}
    isLoading={$leaderboardQuery.isLoading}
    {hoveredTeamId}
    {solveHighlight}
    {showTop3Context}
    {showDivision}
    onPageChange={p => setParam('page', p, 1)}
  />

  <div class="hidden md:block">
    <ScoresToolbar
      {viewMode}
      {sortMode}
      {page}
      {totalPages}
      isFetching={$leaderboardQuery.isFetching}
      {showTop3Context}
      onViewModeChange={setViewMode}
      onSortModeChange={setSortMode}
      onPageChange={p => setParam('page', p, 1)}
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
          <div class="header-row bg-background-l0 sticky top-0 z-20 flex">
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
                  offset={(page - 1) * PAGE_SIZE}
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

          <div class="flex flex-col gap-1">
            {#if $leaderboardQuery.isLoading && $challengesQuery.isLoading}
              {#each Array(PAGE_SIZE) as _}
                <SkeletonRow {showDivision} isMinimal={viewMode === 'minimal'} />
              {/each}
            {:else if $leaderboardQuery.isLoading}
              {@const colCount =
                viewMode === 'categories' ? categoryGroups.length : challenges.length}
              {#each Array(PAGE_SIZE) as _}
                <SkeletonRow
                  {showDivision}
                  isMinimal={viewMode === 'minimal'}
                  colCount={viewMode !== 'minimal' ? colCount : 0}
                />
              {/each}
            {:else if entries.length === 0}
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
              {#each entries as entry, i (entry.id)}
                {@const rank = (page - 1) * PAGE_SIZE + i + 1}
                {@const solves = solvesByTeam.get(entry.id)}
                {@const solveTimes = solvesWithTimeByTeam.get(entry.id)}
                {@const isYou = currentUser?.id === entry.id}

                <div
                  class={cn(
                    'bg-background-l1 data-row group flex min-w-0 rounded-lg',
                    viewMode === 'minimal' ? 'w-full' : 'w-fit'
                  )}
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
                    sparklineData={sparklineDataByTeam.get(entry.id) ?? []}
                    {page}
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
                  sparklineData={sparklineDataByTeam.get(currentUser.id) ?? []}
                  {page}
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
