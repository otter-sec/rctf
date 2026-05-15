<script lang="ts">
  import type {
    createScoresDataModel,
    createScoresGraphDataModel,
  } from './scores-data-model.svelte'
  import { SCORE_LOADING_ROW_COUNT, SCORE_ROW_HEIGHT_FULL_PX } from './scores-layout-constants'
  import type { createScoresRouteState } from './scores-route-state.svelte'
  import {
    getSelfSolves,
    getSelfSolveTimes,
    getSelfTeamRowData,
    getTeamRowData,
  } from './scores-team-row-data'
  import ScoresTeamRow from './scores-team-row.svelte'
  import type { createScoresViewportState } from './scores-viewport-state.svelte'
  import type {
    CategoryGroup,
    ChallengeInfo,
    CurrentUserScoreData,
    ScoreEntry,
    TooltipData,
  } from './types'

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

  const loadingRows = Array.from({ length: SCORE_LOADING_ROW_COUNT }, (_, index) => index)
  const emptySolves = new Set<string>()
  const scroll = $derived(viewportState.scroll)

  const teamRowProps = $derived({
    viewMode: routeState.viewMode,
    sortMode: routeState.sortMode,
    categoryGroups: scoreData.categoryGroups,
    challenges,
    focusedChallengeId: routeState.focusedChallengeId,
    themeEpoch: viewportState.themeRenderEpoch,
    renderEpoch,
    isScrolling: scroll.isScrolling,
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
  <virtual-row loading style:transform>
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
  </virtual-row>
{/snippet}

<virtual-list
  style:height={scoreData.isLoading
    ? `${SCORE_LOADING_ROW_COUNT * SCORE_ROW_HEIGHT_FULL_PX}px`
    : `${scroll.totalSize}px`}
>
  {#if scoreData.isLoading}
    {#each loadingRows as index (index)}
      {@render loadingRow(`translate3d(0, ${index * SCORE_ROW_HEIGHT_FULL_PX}px, 0)`)}
    {/each}
  {:else}
    {#each scroll.virtualItems as row (row.index)}
      {#if row.index < scoreData.entries.length}
        {@const entry = scoreData.entries[row.index]!}
        {@const solves = scoreData.solvesByTeam.get(entry.id) ?? emptySolves}
        {@const solveTimes = scoreData.solveTimesByTeam.get(entry.id) ?? null}

        <virtual-row
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
        </virtual-row>
      {:else}
        {@render loadingRow(`translate3d(0, ${row.start - viewportState.listScrollMargin}px, 0)`)}
      {/if}
    {/each}
  {/if}
</virtual-list>

{#if viewportState.showSelfRow && scoreData.currentUser}
  {@const currentUser = scoreData.currentUser}
  {@const selfSolves = getSelfSolves(currentUser)}
  {@const selfSolveTimes = getSelfSolveTimes(currentUser)}
  {@const isTop = viewportState.selfRowPosition === 'top'}

  <self-row
    position={isTop ? 'top' : 'bottom'}
    style:top={isTop ? `${viewportState.listScrollMargin}px` : undefined}
    style:order={isTop ? '-1' : undefined}
    style:margin-block-end={isTop ? 'calc(-1 * var(--score-row-height-full))' : undefined}
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
  </self-row>
{/if}

<style>
  virtual-list {
    display: block;
    position: relative;
    width: 100%;
    contain: layout style;
  }

  virtual-row {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    display: flex;
    width: 100%;
    contain: layout style paint;

    &[loading] {
      height: var(--score-row-height-full);
    }
  }

  self-row {
    position: sticky;
    z-index: 20;
    display: flex;
    height: var(--score-row-height-full);
    background: var(--background-l0);
    contain: layout style paint;

    &[position='top'] {
      padding-block-end: var(--score-row-gap);
    }

    &[position='bottom'] {
      inset-block-end: 0;
      margin-block-start: auto;
      padding-block-start: var(--score-row-gap);
    }
  }

  @media (width >= 48rem) {
    virtual-list {
      width: calc(var(--score-team-column-width) + var(--score-content-width));
    }

    virtual-row {
      width: auto;
    }
  }
</style>
