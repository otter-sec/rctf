<script lang="ts">
  import { ScrollArea } from '$lib/components'
  import { cn } from '$lib/utils'
  import type { Snippet } from 'svelte'
  import type { Attachment } from 'svelte/attachments'
  import ScoresChallengeHeader from './scores-leaderboard-challenge-header.svelte'
  import type { createScoresDataModel } from './scores-leaderboard-data-model.svelte'
  import ScoresGraphControls from './scores-leaderboard-graph-controls.svelte'
  import ScoresGraph from './scores-leaderboard-graph.svelte'
  import {
    CELL_WIDTH,
    DIAGONAL_OVERFLOW,
    HEADER_HEIGHT,
    ROW_GAP,
    ROW_HEIGHT,
  } from './scores-leaderboard-layout-constants'
  import ScoresFades from './scores-leaderboard-scroll-fades.svelte'
  import type { createScoresViewportState } from './scores-leaderboard-scroll-state.svelte'
  import type { createScoresRouteState } from './scores-page-url-state.svelte'
  import type { ChallengeInfo, ScoreGraphEntry } from './scores-shared-types'

  type ScoreData = ReturnType<typeof createScoresDataModel>
  type RouteState = ReturnType<typeof createScoresRouteState>
  type ViewportState = ReturnType<typeof createScoresViewportState>

  interface GraphProps {
    hoveredTeamId: string | null
    offset: number
    solveHighlight: { teamId: string; time: number } | null
    graphData: ScoreGraphEntry[]
    teamRanks: Map<string, number>
    teamColors: Map<string, string>
    contextTeamIds: Set<string>
    showTop3Context: boolean
    showSelfContext: boolean
    forceContextTeams: boolean
  }

  interface Props {
    scoreData: ScoreData
    routeState: RouteState
    viewportState: ViewportState
    graphProps: GraphProps
    challenges: ChallengeInfo[]
    children: Snippet
  }

  let { scoreData, routeState, viewportState, graphProps, challenges, children }: Props = $props()

  const scroll = $derived(viewportState.scroll)
  const selfRowAnchor = $derived(
    viewportState.showSelfRow ? viewportState.selfRowPosition : undefined
  )

  const headerRowAttachment: Attachment<HTMLElement> = node => {
    viewportState.headerRowRef = node
    return () => {
      if (viewportState.headerRowRef === node) viewportState.headerRowRef = null
    }
  }
  let headerChallengeScrollRef = $state<HTMLElement | null>(null)
  let syncedHeaderScrollLeft = -1

  $effect(() => {
    const header = headerChallengeScrollRef
    const scrollMetrics = viewportState.scrollMetrics
    if (!header || !scrollMetrics) return

    const nextScrollLeft = scrollMetrics.scrollLeft
    if (syncedHeaderScrollLeft === nextScrollLeft) return

    syncedHeaderScrollLeft = nextScrollLeft
    header.scrollLeft = nextScrollLeft
  })

  function handleChallengeFocus(id: string) {
    const wasFocused = routeState.focusedChallengeId === id
    routeState.setFocusedChallenge(wasFocused ? null : id)

    if (!wasFocused) {
      const viewportRef = scroll.state.viewportRef
      if (viewportRef) viewportRef.scrollTop = 0
    }
  }
</script>

{#snippet graphPanel()}
  <ScoresGraphControls
    showTop3Context={routeState.showTop3Context}
    showSelfContext={routeState.showSelfContext}
    onShowTop3ContextChange={routeState.setShowTop3Context}
    onShowSelfContextChange={routeState.setShowSelfContext}
  />
  <ScoresGraph class="h-full w-full p-3" {...graphProps} />
{/snippet}

<div class="flex justify-center px-4 md:px-9">
  <div
    class="scores-leaderboard relative isolate w-full max-w-full md:w-fit"
    data-self-row={selfRowAnchor}
    style:--row-gap={`${ROW_GAP}px`}
    style:--row-height-full={`${ROW_HEIGHT}px`}
    style:--cell-width={`${CELL_WIDTH}px`}
    style:--header-height={`${HEADER_HEIGHT}px`}
    style:--diagonal-overflow={`${DIAGONAL_OVERFLOW}px`}
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
      {@render graphPanel()}
    </div>

    <div class="scores-leaderboard-scroll">
      <ScrollArea
        class="h-full"
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
          <div class="hidden h-(--header-height) shrink-0 md:block" aria-hidden="true"></div>

          {@render children()}
        </div>
      </ScrollArea>
    </div>

    <div
      class="
        bg-background-l0 pointer-events-none absolute inset-x-0 top-0 z-30 hidden
        h-(--header-height) md:flex
      "
      {@attach headerRowAttachment}
    >
      <div
        class="group/graph bg-background-l0 pointer-events-auto z-30 w-(--team-column-width) shrink-0"
      >
        <div class="bg-background-l1 h-full w-full rounded-t-3xl rounded-bl-xl">
          {@render graphPanel()}
        </div>
      </div>
      <div
        bind:this={headerChallengeScrollRef}
        class="pointer-events-auto min-w-0 flex-1 overflow-hidden"
      >
        <div class="w-max">
          {#if !scoreData.challengesQuery.isLoading}
            <ScoresChallengeHeader
              viewMode={routeState.viewMode}
              sortMode={routeState.sortMode}
              categoryGroups={scoreData.categoryGroups}
              {challenges}
              focusedChallengeId={routeState.focusedChallengeId}
              onChallengeFocus={handleChallengeFocus}
            />
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .scores-leaderboard {
    --app-header-height: 72px;
    --toolbar-height: 96px;
    --mobile-graph-gap: 8px;
    --page-bottom-gap: 16px;
    --row-height: calc(var(--row-height-full) - var(--row-gap));
    --name-row-height: 128px;
    --team-column-width: 100%;
    --content-column-width: 0px;
    --self-row-height: var(--row-height-full);
    --self-row-offset: 0px;
    --self-row-top-offset: 0px;
    --score-scroll-padding-top: 0px;
  }

  .scores-leaderboard[data-self-row='bottom'] {
    --self-row-offset: var(--row-height-full);
  }

  .scores-leaderboard[data-self-row='top'] {
    --self-row-top-offset: var(--row-height-full);
    --score-scroll-padding-top: calc(var(--row-height-full) + var(--row-gap));
  }

  .scores-leaderboard-scroll {
    height: calc(
      100dvh - var(--app-header-height) - var(--toolbar-height) - var(--mobile-graph-gap) -
        var(--header-height) - var(--page-bottom-gap)
    );
  }

  @media (min-width: 768px) {
    .scores-leaderboard {
      --toolbar-height: 52px;
      --mobile-graph-gap: 0px;
      --team-column-width: calc(60vw - 72px);
      --content-column-width: calc(40vw + 72px);
      --score-scroll-padding-top: var(--header-height);
    }

    .scores-leaderboard[data-self-row='top'] {
      --score-scroll-padding-top: calc(
        var(--header-height) + var(--row-height-full) + var(--row-gap)
      );
    }

    .scores-leaderboard-scroll {
      height: calc(
        100dvh - var(--app-header-height) - var(--toolbar-height) - var(--page-bottom-gap)
      );
    }
  }

  @media (min-width: 1280px) {
    .scores-leaderboard {
      --team-column-width: calc(45vw - 72px);
      --content-column-width: calc(55vw + 72px);
    }
  }
</style>
