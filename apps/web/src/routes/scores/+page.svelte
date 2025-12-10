<script lang="ts">
  import { goto } from '$app/navigation'
  import { page as pageState } from '$app/state'
  import { IconCircleDashed } from '$lib/icons'
  import { ScrollArea } from '$lib/components'
  import {
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
  import type { CategoryGroup, ChallengeInfo, SortMode, TooltipData, ViewMode } from './types'

  const page = $derived.by(() => {
    const n = parseInt(pageState.url.searchParams.get('page') ?? '1', 10)
    return isNaN(n) || n < 1 ? 1 : n
  })

  const viewMode = $derived.by(() => {
    const v = pageState.url.searchParams.get('view')
    if (v === 'categories' || v === 'minimal') return v as ViewMode
    return 'challenges' as ViewMode
  })

  const sortMode = $derived.by(() => {
    const s = pageState.url.searchParams.get('sort')
    return s === 'solves' ? 'solves' : ('categories' as SortMode)
  })

  function setParam(key: string, value: string | number, defaultValue: string | number) {
    const url = new URL(pageState.url)
    if (value === defaultValue) url.searchParams.delete(key)
    else url.searchParams.set(key, String(value))
    goto(url, { replaceState: true, keepFocus: true, noScroll: true })
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

    const allPoints: { time: number; score: number }[][] = []

    for (const team of graphData) {
      const filtered = team.points
        .filter(p => p.time <= CUTOFF_TIME)
        .map(p => ({ time: p.time, score: p.score }))
      allPoints.push(filtered)
    }

    if (selfGraphData) {
      const filtered = selfGraphData.points
        .filter(p => p.time <= CUTOFF_TIME)
        .map(p => ({ time: p.time, score: p.score }))
      allPoints.push(filtered)
    }

    const maxTime = Math.max(...allPoints.flatMap(pts => pts.map(p => p.time)), 0)
    const windowStart = maxTime - SPARKLINE_WINDOW

    const result = new Map<string, { time: number; score: number }[]>()

    for (const team of graphData) {
      const filtered = team.points
        .filter(p => p.time >= windowStart && p.time <= CUTOFF_TIME)
        .map(p => ({ time: p.time, score: p.score }))
      result.set(team.id, filtered)
    }

    if (selfGraphData && !result.has(selfGraphData.id)) {
      const filtered = selfGraphData.points
        .filter(p => p.time >= windowStart && p.time <= CUTOFF_TIME)
        .map(p => ({ time: p.time, score: p.score }))
      result.set(selfGraphData.id, filtered)
    }

    return result
  })

  const rankDeltaByTeam = $derived.by(() => {
    const selfGraphData = $selfGraphQuery.data
    const result = new Map<string, number>()

    const allPoints = graphData.flatMap(t => t.points.filter(p => p.time <= CUTOFF_TIME))
    if (allPoints.length === 0) return result

    const currentTime = Math.max(...allPoints.map(p => p.time))
    const pastTime = currentTime - DELTA_WINDOW

    function getScoreAtTime(points: { time: number; score: number }[], targetTime: number): number {
      const filtered = points.filter(p => p.time <= targetTime && p.time <= CUTOFF_TIME)
      if (filtered.length === 0) return 0
      const latest = filtered.reduce<{ time: number; score: number } | null>(
        (max, p) => (!max || p.time > max.time ? p : max),
        null
      )
      return latest?.score ?? 0
    }

    const teamsWithScores: { id: string; currentScore: number; pastScore: number }[] = []

    for (const team of graphData) {
      const currentScore = getScoreAtTime(team.points, currentTime)
      const pastScore = getScoreAtTime(team.points, pastTime)
      teamsWithScores.push({ id: team.id, currentScore, pastScore })
    }

    if (selfGraphData && !teamsWithScores.some(t => t.id === selfGraphData.id)) {
      const currentScore = getScoreAtTime(selfGraphData.points, currentTime)
      const pastScore = getScoreAtTime(selfGraphData.points, pastTime)
      teamsWithScores.push({ id: selfGraphData.id, currentScore, pastScore })
    }

    const currentRanks = [...teamsWithScores]
      .sort((a, b) => b.currentScore - a.currentScore)
      .map((t, i) => ({ id: t.id, rank: i + 1 }))
    const currentRankMap = new Map(currentRanks.map(t => [t.id, t.rank]))

    const pastRanks = [...teamsWithScores]
      .sort((a, b) => b.pastScore - a.pastScore)
      .map((t, i) => ({ id: t.id, rank: i + 1 }))
    const pastRankMap = new Map(pastRanks.map(t => [t.id, t.rank]))

    for (const team of teamsWithScores) {
      const currentRank = currentRankMap.get(team.id) ?? 0
      const pastRank = pastRankMap.get(team.id) ?? 0

      const delta = pastRank - currentRank
      if (delta !== 0) {
        result.set(team.id, delta)
      }
    }

    return result
  })

  let showTop3Context = $state(true)
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
    const solves = solvesByTeam.get(teamId)
    const solved = group.challenges.filter(c => solves?.has(c.id)).length
    return {
      solved,
      total: group.challenges.length,
      percent: (solved / group.challenges.length) * 100,
    }
  }

  function getSelfCategoryStats(group: CategoryGroup) {
    if (!currentUser) return { solved: 0, total: group.challenges.length, percent: 0 }
    const solved = group.challenges.filter(c => currentUser.solves.some(s => s.id === c.id)).length
    return {
      solved,
      total: group.challenges.length,
      percent: (solved / group.challenges.length) * 100,
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
    onViewModeChange={v => setParam('view', v, 'challenges')}
    onSortModeChange={s => setParam('sort', s, 'categories')}
    onPageChange={p => setParam('page', p, 1)}
    onShowTop3ContextChange={v => (showTop3Context = v)}
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
                'h-(--header-height) rounded-3xl rounded-bl-lg',
                viewMode !== 'minimal' && 'bg-background-l1 rounded-br-none'
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

        <div class={cn('flex flex-col gap-1', $leaderboardQuery.isFetching && 'opacity-50')}>
          {#if $leaderboardQuery.isLoading && $challengesQuery.isLoading}
            {#each Array(PAGE_SIZE) as _}
              <div
                class={cn(
                  'bg-background-l2 data-row flex rounded-lg',
                  viewMode === 'minimal' ? 'w-full' : 'w-fit'
                )}
              >
                <div class="col-team sticky left-0 z-10 flex h-16 items-center rounded-lg px-4">
                  <div class="flex min-w-0 flex-1 items-center gap-3">
                    <div class="flex w-16 flex-col items-center gap-1">
                      <div class="bg-background-l3 h-5 w-10 rounded"></div>
                      <div class="bg-background-l3 h-4 w-8 rounded"></div>
                    </div>
                    <div class="bg-background-l3 size-12 rounded-lg"></div>
                    <div class="flex min-w-0 flex-1 flex-col gap-1">
                      <div class="bg-background-l3 h-5 w-32 max-w-full rounded"></div>
                      <div class="bg-background-l3 h-4 w-20 max-w-full rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          {:else if $leaderboardQuery.isLoading}
            {@const colCount =
              viewMode === 'categories' ? categoryGroups.length : challenges.length}
            {#each Array(PAGE_SIZE) as _}
              <div
                class={cn(
                  'bg-background-l2 data-row flex rounded-lg',
                  viewMode === 'minimal' ? 'w-full' : 'w-fit'
                )}
              >
                <div
                  class={cn(
                    'col-team bg-background-l2 sticky left-0 z-10 flex h-16 items-center px-4',
                    viewMode === 'minimal' ? 'rounded-lg' : 'rounded-l-lg'
                  )}
                >
                  <div class="flex min-w-0 flex-1 items-center gap-3">
                    <div class="flex w-16 flex-col items-center gap-1">
                      <div class="bg-background-l3 h-5 w-10 rounded"></div>
                      <div class="bg-background-l3 h-4 w-8 rounded"></div>
                    </div>
                    <div class="bg-background-l3 size-12 rounded-lg"></div>
                    <div class="flex min-w-0 flex-1 flex-col gap-1">
                      <div class="bg-background-l3 h-5 w-32 max-w-full rounded"></div>
                      <div class="bg-background-l3 h-4 w-20 max-w-full rounded"></div>
                    </div>
                  </div>
                </div>
                {#if viewMode !== 'minimal'}
                  <div
                    class="bg-background-l2 mr-(--diagonal-overflow) flex gap-1 rounded-r-md pr-4 pl-1"
                  >
                    {#each Array(colCount) as _}
                      <div class="bg-background-l2 flex h-16 w-12 items-center justify-center">
                        <IconCircleDashed class="text-foreground-l5/25 size-7" />
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}
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
          <div
            class="bg-background-l0 sticky bottom-0 z-20 h-(--self-row-height) pt-3 shadow-[0_-8px_16px_rgba(0,0,0,0.3)]"
          >
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
                  getCategoryStats={getSelfCategoryStats}
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

{#if tooltipData}
  <ScoresSolveTooltip data={tooltipData} x={tooltipX} y={tooltipY} />
{/if}

<style>
  .scoreboard {
    --team-column-width: 45vw;
    --header-height: 12rem;
    --name-row-height: 8rem;
    --self-row-height: 4.75rem;
    --diagonal-overflow: 5rem;
  }

  @media (max-width: 768px) {
    .scoreboard {
      --team-column-width: 100%;
    }
  }

  @media (min-width: 769px) and (max-width: 1280px) {
    .scoreboard {
      --team-column-width: 60vw;
    }
  }

  :global(.col-team) {
    width: var(--team-column-width);
    overflow: hidden;
  }
</style>
