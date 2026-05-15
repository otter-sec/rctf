<script lang="ts">
  import type {
    createScoresDataModel,
    createScoresGraphDataModel,
  } from './scores-leaderboard-data-model.svelte'
  import { LOADING_ROW_COUNT, ROW_HEIGHT } from './scores-leaderboard-layout-constants'
  import type { createScoresViewportState } from './scores-leaderboard-scroll-state.svelte'
  import {
    getSelfSolves,
    getSelfSolveTimes,
    getSelfTeamRowData,
    getTeamRowData,
  } from './scores-leaderboard-team-row-data'
  import ScoresTeamRow from './scores-leaderboard-team-row.svelte'
  import type { createScoresRouteState } from './scores-page-url-state.svelte'
  import type {
    CategoryGroup,
    ChallengeInfo,
    CurrentUserScoreData,
    ScoreEntry,
    TooltipData,
  } from './scores-shared-types'

  type ScoreData = ReturnType<typeof createScoresDataModel>
  type GraphState = ReturnType<typeof createScoresGraphDataModel>
  type RouteState = ReturnType<typeof createScoresRouteState>
  type ViewportState = ReturnType<typeof createScoresViewportState>

  interface Props {
    scoreData: ScoreData
    graphState: GraphState
    routeState: RouteState
    viewportState: ViewportState
    challenges: ChallengeInfo[]
    renderEpoch: number
    onCellHover: (data: TooltipData | null, x: number, y: number) => void
    onSparklineHover: (teamId: string | null) => void
  }

  let {
    scoreData,
    graphState,
    routeState,
    viewportState,
    challenges,
    renderEpoch,
    onCellHover,
    onSparklineHover,
  }: Props = $props()

  const loadingRows = Array.from({ length: LOADING_ROW_COUNT }, (_, index) => index)
  const emptySolves = new Set<string>()
  const scroll = $derived(viewportState.scroll)

  const teamRowProps = $derived({
    contentWidth: viewportState.contentWidth,
    viewMode: routeState.viewMode,
    sortMode: routeState.sortMode,
    categoryGroups: scoreData.categoryGroups,
    challenges,
    focusedChallengeId: routeState.focusedChallengeId,
    themeEpoch: viewportState.themeRenderEpoch,
    renderEpoch,
    isScrolling: scroll.isScrolling,
    isDesktop: viewportState.isDesktop,
    onCellHover,
  })

  function getRowData(entry: ScoreEntry, rowIndex: number) {
    return getTeamRowData({
      entry,
      rowIndex,
      search: routeState.search,
      focusedChallengeId: routeState.focusedChallengeId,
      originalRankByTeam: scoreData.originalRankByTeam,
      rankDeltaByTeam: graphState.rankDeltaByTeam,
      sparklineDataByTeam: graphState.sparklineDataByTeam,
      currentUser: scoreData.currentUser,
      teamColorMap: scoreData.teamColorMap,
      showDivision: scoreData.showDivision,
      divisions: scoreData.divisions,
    })
  }

  function getSelfRowData(currentUser: CurrentUserScoreData) {
    return getSelfTeamRowData({
      currentUser,
      rankDeltaByTeam: graphState.rankDeltaByTeam,
      sparklineDataByTeam: graphState.sparklineDataByTeam,
      teamColorMap: scoreData.teamColorMap,
      showDivision: scoreData.showDivision,
      divisions: scoreData.divisions,
    })
  }

  function getEmptyCategoryStats(group: CategoryGroup) {
    return scoreData.getCategoryStatsForSolves(null, group)
  }
</script>

{#snippet loadingRow(transform: string)}
  <div
    class="
      absolute top-0 left-0 flex h-(--row-height-full) w-full contain-[layout_style_paint]
      md:w-auto
    "
    style:transform
  >
    <ScoresTeamRow
      data={null}
      solves={null}
      solveTimes={null}
      isLoading
      {...teamRowProps}
      getCategoryStats={getEmptyCategoryStats}
      getBloodIndex={() => -1}
      onSparklineHover={() => {}}
      onSparklineUnhover={() => {}}
    />
  </div>
{/snippet}

<div
  class="relative contain-[layout_style]"
  style:height={scoreData.isLoading
    ? `${LOADING_ROW_COUNT * ROW_HEIGHT}px`
    : `${scroll.totalSize}px`}
  style:width={viewportState.isDesktop
    ? `calc(var(--team-column-width) + ${viewportState.contentWidth}px)`
    : '100%'}
>
  {#if scoreData.isLoading}
    {#each loadingRows as index (index)}
      {@render loadingRow(`translate3d(0, ${index * ROW_HEIGHT}px, 0)`)}
    {/each}
  {:else}
    {#each scroll.virtualItems as row (row.index)}
      {#if row.index < scoreData.entries.length}
        {@const entry = scoreData.entries[row.index]!}
        {@const solves = scoreData.solvesByTeam.get(entry.id) ?? emptySolves}
        {@const solveTimes = scoreData.solveTimesByTeam.get(entry.id) ?? null}

        <div
          class="
            absolute top-0 left-0 flex w-full contain-[layout_style_paint]
            md:w-auto
          "
          style:height={`${row.size}px`}
          style:transform={`translate3d(0, ${row.start - viewportState.listScrollMargin}px, 0)`}
        >
          <ScoresTeamRow
            data={getRowData(entry, row.index)}
            {solves}
            {solveTimes}
            {...teamRowProps}
            getCategoryStats={group => scoreData.getCategoryStatsForSolves(solves, group)}
            getBloodIndex={challengeId => scoreData.getBloodIndex(challengeId, entry.id)}
            onSparklineHover={() => onSparklineHover(entry.id)}
            onSparklineUnhover={() => onSparklineHover(null)}
          />
        </div>
      {:else}
        {@render loadingRow(`translate3d(0, ${row.start - viewportState.listScrollMargin}px, 0)`)}
      {/if}
    {/each}
  {/if}
</div>

{#if viewportState.showSelfRow && scoreData.currentUser}
  {@const currentUser = scoreData.currentUser}
  {@const selfSolves = getSelfSolves(currentUser)}
  {@const selfSolveTimes = getSelfSolveTimes(currentUser)}
  {@const isTop = viewportState.selfRowPosition === 'top'}

  <div
    class={[
      'bg-background-l0 sticky z-20 flex h-(--row-height-full)',
      'contain-[layout_style_paint]',
      isTop ? 'pb-1' : 'bottom-0 mt-auto pt-1',
    ]}
    style:top={isTop ? `${viewportState.listScrollMargin}px` : undefined}
    style:order={isTop ? '-1' : undefined}
    style:margin-bottom={isTop ? `-${ROW_HEIGHT}px` : undefined}
  >
    <ScoresTeamRow
      data={getSelfRowData(currentUser)}
      solves={scoreData.isLoading ? null : selfSolves}
      solveTimes={scoreData.isLoading ? null : selfSolveTimes}
      isSelf
      isLoading={scoreData.isLoading}
      {...teamRowProps}
      getCategoryStats={group => scoreData.getCategoryStatsForSolves(selfSolves, group)}
      getBloodIndex={challengeId => scoreData.getBloodIndex(challengeId, currentUser.id)}
      onSparklineHover={() => onSparklineHover(currentUser.id)}
      onSparklineUnhover={() => onSparklineHover(null)}
    />
  </div>
{/if}
