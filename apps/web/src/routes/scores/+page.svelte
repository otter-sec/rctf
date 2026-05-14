<script lang="ts">
  import { CtfNotStarted, EmptyState, Spinner, Tooltip } from '$lib/components'
  import { IconChartAreaLineFilled, IconFlagFilled } from '$lib/icons'
  import { createHoverTooltip } from '$lib/utils'
  import { getCategoryConfig } from '$lib/utils/categories'
  import ScoresCellTooltipContent from './scores-cell-tooltip-content.svelte'
  import { createScoresDataModel, createScoresGraphDataModel } from './scores-data-model.svelte'
  import ScoresLeaderboardBody from './scores-leaderboard-body.svelte'
  import ScoresLeaderboardFrame from './scores-leaderboard-frame.svelte'
  import { createScoresRouteState } from './scores-route-state.svelte'
  import ScoresScreenshotModal from './scores-screenshot-modal.svelte'
  import ScoresToolbar from './scores-toolbar.svelte'
  import { createScoresViewportState } from './scores-viewport-state.svelte'
  import type { TooltipData } from './types'

  const routeState = createScoresRouteState()
  const scoreData = createScoresDataModel({
    division: () => routeState.division,
    search: () => routeState.search,
    focusedChallengeId: () => routeState.focusedChallengeId,
  })
  const cellTooltip = createHoverTooltip<TooltipData>()

  const challenges = $derived(scoreData.getChallenges(routeState.sortMode))
  const viewportState = createScoresViewportState({
    entries: () => scoreData.entries,
    total: () => scoreData.total,
    isLoading: () => scoreData.isLoading,
    search: () => routeState.search,
    focusedChallengeId: () => routeState.focusedChallengeId,
    currentUser: () => scoreData.currentUser,
    showTop3Context: () => routeState.showTop3Context,
    showSelfContext: () => routeState.showSelfContext,
    cellCount: () =>
      routeState.viewMode === 'categories' ? scoreData.categoryGroups.length : challenges.length,
    allGraphData: () => scoreData.allGraphData,
    teamRanks: () => scoreData.teamRanks,
    hasNextPage: () => scoreData.leaderboardQuery.hasNextPage,
    isFetchingNextPage: () => scoreData.leaderboardQuery.isFetchingNextPage,
    fetchNextPage: () => scoreData.leaderboardQuery.fetchNextPage(),
    onScroll: () => cellTooltip.close(),
  })
  const graphState = createScoresGraphDataModel({
    showSelfRow: () => viewportState.showSelfRow,
    search: () => routeState.search,
    entries: () => scoreData.entries,
    allGraphData: () => scoreData.allGraphData,
    currentUser: () => scoreData.currentUser,
    teamColorMap: () => scoreData.teamColorMap,
  })

  let screenshotModalOpen = $state(false)
  let sparklineHoveredTeamId = $state<string | null>(null)

  const tooltipGraphState = $derived.by(() => {
    const data = cellTooltip.open ? cellTooltip.payload : null
    if (!data || (data.type === 'challenge' && !data.solved)) {
      return {
        hoveredTeamId: null,
        solveHighlight: null,
      }
    }

    return {
      hoveredTeamId: data.teamId,
      solveHighlight:
        data.type === 'challenge' && data.solveTime
          ? { teamId: data.teamId, time: data.solveTime }
          : null,
    }
  })

  const hoveredTeamId = $derived(sparklineHoveredTeamId ?? tooltipGraphState.hoveredTeamId)
  const solveHighlight = $derived(tooltipGraphState.solveHighlight)

  const focusedChallenge = $derived.by(() => {
    const id = routeState.focusedChallengeId
    const challenge = id ? scoreData.challengesData[id] : null
    if (!id || !challenge) return null

    const config = getCategoryConfig(challenge.category)
    return {
      id,
      name: challenge.name,
      icon: config.icon,
      color: config.color,
    }
  })
  const renderEpoch = $derived(Math.max(scoreData.dataEpoch, viewportState.themeRenderEpoch))

  const graphProps = $derived({
    hoveredTeamId,
    offset: 0,
    solveHighlight,
    graphData: viewportState.visibleGraphData,
    teamRanks: scoreData.teamRanks,
    teamColors: scoreData.teamColorMap,
    contextTeamIds: viewportState.contextTeamIds,
    showTop3Context: routeState.showTop3Context,
    showSelfContext: routeState.showSelfContext,
    forceContextTeams:
      (!!routeState.search || !!routeState.focusedChallengeId) && routeState.showTop3Context,
  })
</script>

<Tooltip.Provider delayDuration={300} skipDelayDuration={600} disableHoverableContent>
  {#if scoreData.leaderboardQuery.isPending && !routeState.search}
    <div class="flex flex-1 items-center justify-center">
      <Spinner class="size-4" />
    </div>
  {:else if scoreData.isNotStarted}
    <CtfNotStarted />
  {:else}
    <ScoresToolbar
      viewMode={routeState.viewMode}
      sortMode={routeState.sortMode}
      total={scoreData.total}
      loadedCount={scoreData.entries.length}
      divisions={scoreData.divisions}
      division={scoreData.division}
      {focusedChallenge}
      search={routeState.searchInput}
      isSearching={scoreData.leaderboardQuery.isFetching && !!routeState.search}
      onViewModeChange={routeState.setViewMode}
      onSortModeChange={routeState.setSortMode}
      onDivisionChange={routeState.setDivision}
      onScreenshotClick={() => (screenshotModalOpen = true)}
      onChallengeFocusClear={() => routeState.setFocusedChallenge(null)}
      onSearchChange={routeState.setSearchInput}
    />

    {#if !scoreData.isLoading && scoreData.entries.length === 0 && routeState.focusedChallengeId}
      <div
        class="
          bg-background-l0 fixed inset-x-0 top-92 bottom-0 z-50 flex items-center justify-center
          md:top-79
        "
      >
        <EmptyState
          icon={IconFlagFilled}
          title="No solves"
          subtitle="No matching teams have solved this challenge"
        />
      </div>
    {/if}

    {#if !scoreData.isLoading && scoreData.entries.length === 0 && !routeState.focusedChallengeId}
      <div
        class="
          flex h-[calc(100dvh-72px-96px)] items-center justify-center
          md:h-[calc(100dvh-72px-52px)]
        "
      >
        <EmptyState
          icon={IconChartAreaLineFilled}
          title={routeState.search ? 'No teams found' : 'No scores yet'}
          subtitle={routeState.search
            ? `No results for "${routeState.search}"`
            : 'Check back soon for scores!'}
        />
      </div>
    {:else}
      <ScoresLeaderboardFrame
        {scoreData}
        {routeState}
        {viewportState}
        {graphProps}
        {challenges}
      >
        <ScoresLeaderboardBody
          {scoreData}
          {graphState}
          {routeState}
          {viewportState}
          {challenges}
          {renderEpoch}
          onCellHover={cellTooltip.hover}
          onSparklineHover={teamId => (sparklineHoveredTeamId = teamId)}
        />
      </ScoresLeaderboardFrame>
    {/if}
  {/if}

  <Tooltip.Provider delayDuration={300} skipDelayDuration={0} disableHoverableContent>
    <Tooltip.Hover controller={cellTooltip}>
      {#snippet children(data)}
        <ScoresCellTooltipContent {data} />
      {/snippet}
    </Tooltip.Hover>
  </Tooltip.Provider>

  <ScoresScreenshotModal
    bind:open={screenshotModalOpen}
    onOpenChange={open => (screenshotModalOpen = open)}
    teams={graphState.screenshotTeams}
    selfTeam={graphState.screenshotSelfTeam}
    graphData={scoreData.allGraphData}
    categoryGroups={scoreData.categoryGroups}
    solvesByTeam={scoreData.solvesByTeam}
    ctfName={scoreData.clientConfigQuery.data?.ctfName ?? ''}
    startTime={scoreData.clientConfigQuery.data?.startTime ?? null}
    endTime={scoreData.clientConfigQuery.data?.endTime ?? null}
  />
</Tooltip.Provider>
