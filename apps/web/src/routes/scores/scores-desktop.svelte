<script lang="ts">
  import type { LeaderboardEntry, LeaderboardGraphEntry, UserProfile } from '@rctf/types'
  import { get } from 'svelte/store'
  import { createVirtualizer } from '@tanstack/svelte-virtual'
  import { IconMoodWrrrFilled } from '$lib/icons'
  import { EmptyState, ScrollArea, Spinner } from '$lib/components'
  import { cn, observeElementOffset, observeElementRect } from '$lib/utils'
  import { PAGE_SIZE } from './constants'
  import ScoresChallengeHeader from './scores-challenge-header.svelte'
  import ScoresFades from './scores-fades.svelte'
  import ScoresGraph from './scores-graph.svelte'
  import ScoresSolveCells from './scores-solve-cells.svelte'
  import ScoresTeamRow from './scores-team-row.svelte'
  import ScoresToolbar from './scores-toolbar.svelte'
  import SkeletonRow from './skeleton-row.svelte'
  import type { CategoryGroup, ChallengeInfo, SortMode, TooltipData, ViewMode } from './types'

  interface Props {
    viewMode: ViewMode
    sortMode: SortMode
    entries: LeaderboardEntry[]
    total: number
    graphData: LeaderboardGraphEntry[]
    categoryGroups: CategoryGroup[]
    challenges: ChallengeInfo[]
    currentUser: UserProfile | null | undefined
    showSelfRow: boolean
    showDivision: boolean
    showTop3Context: boolean
    solvesByTeam: Map<string, Set<string>>
    solvesWithTimeByTeam: Map<string, Map<string, number>>
    sparklineDataByTeam: Map<string, { time: number; score: number }[]>
    rankDeltaByTeam: Map<string, number>
    challengesData: Record<string, { firstSolvers?: { id: string }[] }>
    isFetching: boolean
    isLoading: boolean
    isFetchingNextPage: boolean
    hasNextPage: boolean
    challengesLoading: boolean
    hoveredTeamId: string | null
    solveHighlight: { teamId: string; time: number } | null
    onViewModeChange: (v: ViewMode) => void
    onSortModeChange: (s: SortMode) => void
    onShowTop3ContextChange: (v: boolean) => void
    onHoverTeam: (id: string | null) => void
    onCellHover: (data: TooltipData | null, x: number, y: number) => void
    onLoadMore: () => void
  }

  let {
    viewMode,
    sortMode,
    entries,
    total,
    graphData,
    categoryGroups,
    challenges,
    currentUser,
    showSelfRow,
    showDivision,
    showTop3Context,
    solvesByTeam,
    solvesWithTimeByTeam,
    sparklineDataByTeam,
    rankDeltaByTeam,
    challengesData,
    isFetching,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    challengesLoading,
    hoveredTeamId,
    solveHighlight,
    onViewModeChange,
    onSortModeChange,
    onShowTop3ContextChange,
    onHoverTeam,
    onCellHover,
    onLoadMore,
  }: Props = $props()

  const ROW_HEIGHT = 68

  let viewportRef = $state<HTMLElement | null>(null)
  let headerRowRef = $state<HTMLElement | null>(null)
  let listScrollMargin = $state(0)

  let showTopFade = $state(false)
  let showBottomFade = $state(true)
  let showLeftFade = $state(false)
  let showRightFade = $state(true)

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

  const virtualizer = createVirtualizer({
    count: 0,
    getScrollElement: () => viewportRef,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
    scrollMargin: 0,
    observeElementRect,
    observeElementOffset,
    isScrollingResetDelay: 100,
  })

  let lastVirtualCount = -1
  let lastVirtualScrollMargin = -1
  let lastVirtualScrollElement: HTMLElement | null = null
  let hasMeasured = false

  $effect(() => {
    const scrollElement = viewportRef
    const count = hasNextPage ? entries.length + 1 : entries.length
    const scrollMargin = listScrollMargin

    const v = get(virtualizer)

    const needsUpdate =
      count !== lastVirtualCount ||
      scrollMargin !== lastVirtualScrollMargin ||
      scrollElement !== lastVirtualScrollElement

    if (needsUpdate) {
      lastVirtualCount = count
      lastVirtualScrollMargin = scrollMargin
      lastVirtualScrollElement = scrollElement
      v.setOptions({ count, scrollMargin })
    }

    // Firefox bug
    if (scrollElement && count > 0 && (!hasMeasured || needsUpdate)) {
      hasMeasured = true
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          v.measure()
        })
      })
    }
  })

  let loadMoreTriggered = false

  $effect(() => {
    const v = viewportRef
    if (!v) return

    let raf = 0
    const run = () => {
      raf = 0
      updateFades()

      if (loadMoreTriggered || !hasNextPage || isFetchingNextPage) return

      const scrollPercent = (v.scrollTop + v.clientHeight) / v.scrollHeight
      if (scrollPercent > 0.7) {
        loadMoreTriggered = true
        onLoadMore()
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
    if (!isFetchingNextPage) {
      loadMoreTriggered = false
    }
  })

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
</script>

<div class="hidden md:block">
  <ScoresToolbar
    {viewMode}
    {sortMode}
    {total}
    loadedCount={entries.length}
    {isFetching}
    {showTop3Context}
    {onViewModeChange}
    {onSortModeChange}
    {onShowTop3ContextChange}
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

          {#if viewMode !== 'minimal' && !challengesLoading}
            <ScoresChallengeHeader {viewMode} {sortMode} {categoryGroups} {challenges} />
          {/if}
        </div>

        <div
          class="virtual-list-container perf-contain-layout perf-backface-hidden bg-background-l1 relative"
          style="height: {$virtualizer.getTotalSize()}px; width: 100%;"
        >
          {#if isLoading && challengesLoading && entries.length === 0}
            <div class="flex flex-col gap-1">
              {#each Array(PAGE_SIZE) as _}
                <SkeletonRow {showDivision} isMinimal={viewMode === 'minimal'} />
              {/each}
            </div>
          {:else if isLoading && entries.length === 0}
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
          {:else if entries.length === 0 && !isLoading}
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
                  style="height: {row.size}px; transform: translate3d(0, {row.start -
                    listScrollMargin}px, 0);"
                >
                  {#if hasNextPage}
                    <Spinner class="text-foreground-l3 size-5" />
                  {/if}
                </div>
              {:else if entries[row.index]}
                {@const entry = entries[row.index]!}
                {@const rank = row.index + 1}
                {@const isYou = currentUser?.id === entry.id}

                <div
                  class={cn(
                    'perf-contain-paint perf-will-transform bg-background-l1 data-row group absolute top-0 left-0 flex min-w-0 rounded-lg',
                    viewMode === 'minimal' ? 'w-full' : 'w-fit'
                  )}
                  style="height: {row.size}px; transform: translate3d(0, {row.start -
                    listScrollMargin}px, 0);"
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
                    delta={rankDeltaByTeam.get(entry.id)}
                    {showDivision}
                    onHover={() => onHoverTeam(entry.id)}
                    onUnhover={() => onHoverTeam(null)}
                  />

                  {#if viewMode !== 'minimal'}
                    {@const solves = solvesByTeam.get(entry.id)}
                    {@const solveTimes = solvesWithTimeByTeam.get(entry.id)}
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
                      {onCellHover}
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
                'perf-contain-paint perf-will-transform bg-background-l1 data-row group flex min-w-0 rounded-lg',
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
                onHover={() => onHoverTeam(currentUser.id)}
                onUnhover={() => onHoverTeam(null)}
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
                  {onCellHover}
                />
              {/if}
            </div>
          </div>
        {/if}
      </ScrollArea>
    </div>
  </div>
</div>

<style>
  .scoreboard {
    --team-column-width: 45vw;
    --header-height: 12rem;
    --name-row-height: 8rem;
    --self-row-height: 4rem;
    --diagonal-overflow: 6rem;
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

  /* Firefox scroll flash fix */
  :global([data-slot='scroll-area-viewport']) {
    background: var(--background-l1) !important;
  }

  .scoreboard {
    background: var(--background-l0);
  }
</style>
