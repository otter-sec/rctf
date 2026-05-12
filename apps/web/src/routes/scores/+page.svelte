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
  import ScoresScreenshotModal from './scores-screenshot-modal.svelte'
  import ScoresTeamRow from './scores-team-row.svelte'
  import ScoresToolbar from './scores-toolbar.svelte'
  import { createScoresDataModel, createScoresGraphDataModel } from './scores-data-model.svelte'
  import { createScoresRouteState } from './scores-route-state.svelte'
  import { createScoresViewportState } from './scores-viewport-state.svelte'
  import type { Attachment } from 'svelte/attachments'
  import type { TooltipData } from './types'

  const ROW_GAP = 4
  const ROW_HEIGHT = 64 + ROW_GAP
  const CELL_WIDTH = 48
  const HEADER_HEIGHT = 192
  const loadingRows = Array.from({ length: 10 }, (_, index) => index)

  const routeState = createScoresRouteState()
  const dataModel = createScoresDataModel({
    division: () => routeState.division,
    search: () => routeState.search,
    focusedChallengeId: () => routeState.focusedChallengeId,
  })
  const cellTooltip = createHoverTooltip<TooltipData>()

  const challenges = $derived(dataModel.getChallenges(routeState.sortMode))
  const viewport = createScoresViewportState({
    entries: () => dataModel.entries,
    total: () => dataModel.total,
    isLoading: () => dataModel.isLoading,
    search: () => routeState.search,
    focusedChallengeId: () => routeState.focusedChallengeId,
    currentUser: () => dataModel.currentUser,
    showTop3Context: () => routeState.showTop3Context,
    showSelfContext: () => routeState.showSelfContext,
    cellCount: () =>
      routeState.viewMode === 'categories' ? dataModel.categoryGroups.length : challenges.length,
    allGraphData: () => dataModel.allGraphData,
    teamRanks: () => dataModel.teamRanks,
    hasNextPage: () => dataModel.leaderboardQuery.hasNextPage,
    isFetchingNextPage: () => dataModel.leaderboardQuery.isFetchingNextPage,
    fetchNextPage: () => dataModel.leaderboardQuery.fetchNextPage(),
    onScroll: () => cellTooltip.close(),
  })
  const graphDataModel = createScoresGraphDataModel({
    showSelfRow: () => viewport.showSelfRow,
    search: () => routeState.search,
    entries: () => dataModel.entries,
    allGraphData: () => dataModel.allGraphData,
    currentUser: () => dataModel.currentUser,
    teamColorMap: () => dataModel.teamColorMap,
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
    viewport.headerRowRef = node
    return () => {
      if (viewport.headerRowRef === node) viewport.headerRowRef = null
    }
  }

  const clientConfigQuery = dataModel.clientConfigQuery
  const leaderboardQuery = dataModel.leaderboardQuery
  const challengesQuery = dataModel.challengesQuery
  const viewMode = $derived(routeState.viewMode)
  const sortMode = $derived(routeState.sortMode)
  const showTop3Context = $derived(routeState.showTop3Context)
  const showSelfContext = $derived(routeState.showSelfContext)
  const searchInput = $derived(routeState.searchInput)
  const search = $derived(routeState.search)
  const focusedChallengeId = $derived(routeState.focusedChallengeId)
  const divisions = $derived(dataModel.divisions)
  const division = $derived(dataModel.division)
  const entries = $derived(dataModel.entries)
  const total = $derived(dataModel.total)
  const currentUser = $derived(dataModel.currentUser)
  const challengesData = $derived(dataModel.challengesData)
  const isNotStarted = $derived(dataModel.isNotStarted)
  const isLoading = $derived(dataModel.isLoading)
  const showDivision = $derived(dataModel.showDivision)
  const categoryGroups = $derived(dataModel.categoryGroups)
  const originalRankByTeam = $derived(dataModel.originalRankByTeam)
  const teamColorMap = $derived(dataModel.teamColorMap)
  const solvesByTeam = $derived(dataModel.solvesByTeam)
  const solveTimesByTeam = $derived(dataModel.solveTimesByTeam)
  const rankDeltaByTeam = $derived(graphDataModel.rankDeltaByTeam)
  const sparklineDataByTeam = $derived(graphDataModel.sparklineDataByTeam)
  const screenshotTeams = $derived(graphDataModel.screenshotTeams)
  const screenshotSelfTeam = $derived(graphDataModel.screenshotSelfTeam)
  const screenshotGraphData = $derived(graphDataModel.screenshotGraphData)
  const scroll = viewport.scroll
  const isDesktop = $derived(viewport.isDesktop)
  const isXl = $derived(viewport.isXl)
  const listScrollMargin = $derived(viewport.listScrollMargin)
  const showTopFade = $derived(viewport.showTopFade)
  const showBottomFade = $derived(viewport.showBottomFade)
  const showLeftFade = $derived(viewport.showLeftFade)
  const showRightFade = $derived(viewport.showRightFade)
  const showSelfRow = $derived(viewport.showSelfRow)
  const selfRowPosition = $derived(viewport.selfRowPosition)
  const contentWidth = $derived(viewport.contentWidth)
  const scrollbarYPadding = $derived(viewport.scrollbarYPadding)
  const renderEpoch = $derived(Math.max(dataModel.dataEpoch, viewport.themeRenderEpoch))

  const graphProps = $derived({
    hoveredTeamId,
    offset: 0,
    solveHighlight,
    graphData: viewport.visibleGraphData,
    teamRanks: dataModel.teamRanks,
    teamColors: dataModel.teamColorMap,
    contextTeamIds: viewport.contextTeamIds,
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
    themeEpoch: viewport.themeRenderEpoch,
    renderEpoch,
    isScrolling: scroll.isScrolling,
    isDesktop,
    onCellHover: cellTooltip.hover,
  })

  const getBloodIndex = dataModel.getBloodIndex
  const getCategoryStatsForSolves = dataModel.getCategoryStatsForSolves
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
      onViewModeChange={routeState.setViewMode}
      onSortModeChange={routeState.setSortMode}
      onDivisionChange={routeState.setDivision}
      onScreenshotClick={() => (screenshotModalOpen = true)}
      onChallengeFocusClear={() => routeState.setFocusedChallenge(null)}
      onSearchChange={routeState.setSearchInput}
    />

    {#if !isLoading && entries.length === 0 && focusedChallengeId}
      <!-- mobile: 72px (nav) + 96px (toolbar) + 192px (graph) + 8px (mb-2) = 368px -->
      <!-- desktop: 72px (nav) + 52px (toolbar) + 192px (header) = 316px -->
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

    {#if !isLoading && entries.length === 0 && !focusedChallengeId}
      <div
        class="
          flex h-[calc(100dvh-72px-96px)] items-center justify-center
          md:h-[calc(100dvh-72px-52px)]
        "
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
            class="
              group/graph bg-background-l1 relative mb-2 h-(--header-height) rounded-lg
              md:hidden
            "
          >
            <ScoresGraphControls
              {showTop3Context}
              {showSelfContext}
              onShowTop3ContextChange={routeState.setShowTop3Context}
              onShowSelfContextChange={routeState.setShowSelfContext}
            />
            <ScoresGraph class="h-full w-full p-3" {...graphProps} />
          </div>

          <!-- 100dvh - 72px (header) - 52px (toolbar) - 16px (bottom gap) -->
          <!-- mobile: 100dvh - header - toolbar - graph gap - graph height - bottom gap -->
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
            scrollbarXClasses={isDesktop ? 'pl-(--team-column-width) -mr-2.5 z-40' : 'hidden'}
            scrollbarYClasses={`z-40 ${scrollbarYPadding}`}
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
                      {showTop3Context}
                      {showSelfContext}
                      onShowTop3ContextChange={routeState.setShowTop3Context}
                      onShowSelfContextChange={routeState.setShowSelfContext}
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
                      routeState.setFocusedChallenge(wasFocused ? null : id)
                      if (!wasFocused) {
                        const viewportRef = scroll.state.viewportRef
                        if (viewportRef) viewportRef.scrollTop = 0
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
                  {#each loadingRows as i (i)}
                    <div
                      class="
                        absolute top-0 left-0 flex h-(--row-height-full) w-full
                        contain-[layout_style_paint] md:w-auto
                      "
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
                        class="
                          absolute top-0 left-0 flex w-full contain-[layout_style_paint]
                          md:w-auto
                        "
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
                          onSparklineHover={() => (sparklineHoveredTeamId = entry.id)}
                          onSparklineUnhover={() => (sparklineHoveredTeamId = null)}
                        />
                      </div>
                    {:else}
                      <div
                        class="
                          absolute top-0 left-0 flex h-(--row-height-full) w-full
                          contain-[layout_style_paint] md:w-auto
                        "
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
                {@const selfSolves = new Set(currentUser.solves.map(solve => solve.id))}
                {@const selfSolveTimes = new Map(
                  currentUser.solves.map(solve => [solve.id, solve.createdAt])
                )}
                {@const isTop = selfRowPosition === 'top'}
                <div
                  class={cn(
                    'bg-background-l0 sticky z-20 flex h-(--row-height-full)',
                    'contain-[layout_style_paint]',
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
                      color: teamColorMap.get(currentUser.id),
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
                    onSparklineHover={() => (sparklineHoveredTeamId = currentUser.id)}
                    onSparklineUnhover={() => (sparklineHoveredTeamId = null)}
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
    <Tooltip.Hover controller={cellTooltip}>
      {#snippet children(data)}
        <ScoresCellTooltipContent {data} />
      {/snippet}
    </Tooltip.Hover>
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
