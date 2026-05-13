<script lang="ts">
  import { CtfNotStarted, EmptyState, ScrollArea, Spinner, Tooltip } from '$lib/components'
  import { IconChartAreaLineFilled, IconFlagFilled } from '$lib/icons'
  import { cn, createHoverTooltip } from '$lib/utils'
  import { getCategoryConfig } from '$lib/utils/categories'
  import ScoresCellTooltipContent from './scores-cell-tooltip-content.svelte'
  import ScoresChallengeHeader from './scores-challenge-header.svelte'
  import ScoresFades from './scores-fades.svelte'
  import ScoresGraphControls from './scores-graph-controls.svelte'
  import ScoresGraph from './scores-graph.svelte'
  import ScoresLeaderboardBody from './scores-leaderboard-body.svelte'
  import { CELL_WIDTH, HEADER_HEIGHT, ROW_GAP, ROW_HEIGHT } from './scores-layout-constants'
  import ScoresScreenshotModal from './scores-screenshot-modal.svelte'
  import ScoresToolbar from './scores-toolbar.svelte'
  import { createScoresDataModel, createScoresGraphDataModel } from './scores-data-model.svelte'
  import { createScoresRouteState } from './scores-route-state.svelte'
  import { createScoresViewportState } from './scores-viewport-state.svelte'
  import type { Attachment } from 'svelte/attachments'
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

  const headerRowAttachment: Attachment<HTMLElement> = node => {
    viewportState.headerRowRef = node
    return () => {
      if (viewportState.headerRowRef === node) viewportState.headerRowRef = null
    }
  }

  const scroll = viewportState.scroll
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
      <div class="flex justify-center px-4 md:px-9">
        <div
          class="relative w-full max-w-full md:w-fit"
          style:--row-height="{ROW_HEIGHT - ROW_GAP}px"
          style:--row-height-full="{ROW_HEIGHT}px"
          style:--cell-width="{CELL_WIDTH}px"
          style:--header-height="{HEADER_HEIGHT}px"
          style:--name-row-height="128px"
          style:--diagonal-overflow="96px"
          style:--team-column-width={viewportState.isDesktop
            ? viewportState.isXl
              ? 'calc(45vw - 72px)'
              : 'calc(60vw - 72px)'
            : '100%'}
          style:--content-column-width={viewportState.isDesktop
            ? viewportState.isXl
              ? 'calc(55vw + 72px)'
              : 'calc(40vw + 72px)'
            : '0px'}
          style:--self-row-height="{ROW_HEIGHT}px"
          style:--self-row-offset={viewportState.showSelfRow &&
          viewportState.selfRowPosition === 'bottom'
            ? `${ROW_HEIGHT}px`
            : '0px'}
          style:--self-row-top-offset={viewportState.showSelfRow &&
          viewportState.selfRowPosition === 'top'
            ? `${ROW_HEIGHT}px`
            : '0px'}
          style:--score-scroll-padding-top={viewportState.showSelfRow &&
          viewportState.selfRowPosition === 'top'
            ? viewportState.isDesktop
              ? 'calc(var(--header-height) + var(--row-height-full) + 4px)'
              : 'calc(var(--row-height-full) + 4px)'
            : viewportState.isDesktop
              ? 'var(--header-height)'
              : '0px'}
        >
          <ScoresFades
            showTop={viewportState.showTopFade}
            showBottom={viewportState.showBottomFade}
            showLeft={viewportState.isDesktop && viewportState.showLeftFade}
            showRight={viewportState.isDesktop && viewportState.showRightFade}
            showSelfRow={viewportState.showSelfRow}
            selfRowPosition={viewportState.selfRowPosition}
            isMinimal={!viewportState.isDesktop}
          />

          <div
            class="
              group/graph bg-background-l1 relative mb-2 h-(--header-height) rounded-lg
              md:hidden
            "
          >
            <ScoresGraphControls
              showTop3Context={routeState.showTop3Context}
              showSelfContext={routeState.showSelfContext}
              onShowTop3ContextChange={routeState.setShowTop3Context}
              onShowSelfContextChange={routeState.setShowSelfContext}
            />
            <ScoresGraph class="h-full w-full p-3" {...graphProps} />
          </div>

          <ScrollArea
            class={viewportState.isDesktop
              ? 'h-[calc(100dvh-72px-52px-16px)]'
              : 'h-[calc(100dvh-72px-96px-8px-192px-16px)]'}
            orientation={viewportState.isDesktop ? 'both' : 'vertical'}
            type={viewportState.isDesktop ? 'always' : 'auto'}
            fadeSize={0}
            bind:viewportRef={scroll.state.viewportRef}
            viewportTabIndex={-1}
            viewportClass={cn(
              'scroll-pt-(--score-scroll-padding-top)',
              viewportState.isDesktop && 'scroll-pl-(--team-column-width)'
            )}
            scrollbarXClasses={viewportState.isDesktop
              ? 'pl-(--team-column-width) -mr-2.5 z-40'
              : 'hidden'}
            scrollbarYClasses={`z-40 ${viewportState.scrollbarYPadding}`}
          >
            <div class="flex min-h-full flex-col">
              <div
                class="bg-background-l0 sticky top-0 z-20 hidden h-(--header-height) md:flex"
                {@attach headerRowAttachment}
              >
                <div
                  class="
                    group/graph bg-background-l0 sticky left-0 z-30 w-(--team-column-width)
                    shrink-0
                  "
                >
                  <div class="bg-background-l1 h-full w-full rounded-t-3xl rounded-bl-xl">
                    <ScoresGraphControls
                      showTop3Context={routeState.showTop3Context}
                      showSelfContext={routeState.showSelfContext}
                      onShowTop3ContextChange={routeState.setShowTop3Context}
                      onShowSelfContextChange={routeState.setShowSelfContext}
                    />
                    <ScoresGraph class="h-full w-full p-3" {...graphProps} />
                  </div>
                </div>
                {#if !scoreData.challengesQuery.isLoading}
                  <ScoresChallengeHeader
                    viewMode={routeState.viewMode}
                    sortMode={routeState.sortMode}
                    categoryGroups={scoreData.categoryGroups}
                    {challenges}
                    focusedChallengeId={routeState.focusedChallengeId}
                    onChallengeFocus={id => {
                      const wasFocused = routeState.focusedChallengeId === id
                      routeState.setFocusedChallenge(wasFocused ? null : id)
                      if (!wasFocused) {
                        const viewportRef = scroll.state.viewportRef
                        if (viewportRef) viewportRef.scrollTop = 0
                      }
                    }}
                  />
                {/if}
              </div>

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
            </div>
          </ScrollArea>
        </div>
      </div>
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
    graphData={graphState.screenshotGraphData}
    categoryGroups={scoreData.categoryGroups}
    solvesByTeam={scoreData.solvesByTeam}
    ctfName={scoreData.clientConfigQuery.data?.ctfName ?? ''}
    startTime={scoreData.clientConfigQuery.data?.startTime ?? null}
    endTime={scoreData.clientConfigQuery.data?.endTime ?? null}
  />
</Tooltip.Provider>
