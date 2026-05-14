<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { Attachment } from 'svelte/attachments'
  import ScoresChallengeHeader from './scores-leaderboard-challenge-header.svelte'
  import type { createScoresDataModel } from './scores-leaderboard-data-model.svelte'
  import ScoresGraphControls from './scores-leaderboard-graph-controls.svelte'
  import ScoresGraph from './scores-leaderboard-graph.svelte'
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

  const viewportAttachment: Attachment<HTMLElement> = node => {
    scroll.state.viewportRef = node
    return () => {
      if (scroll.state.viewportRef === node) scroll.state.viewportRef = null
    }
  }

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
  <div class="scores-leaderboard relative w-full max-w-full md:w-fit" data-self-row={selfRowAnchor}>
    <ScoresFades
      showTop={viewportState.showTopFade}
      showBottom={viewportState.showBottomFade}
      showLeft={viewportState.showLeftFade}
      showRight={viewportState.showRightFade}
      showSelfRow={viewportState.showSelfRow}
      selfRowPosition={viewportState.selfRowPosition}
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
      <div
        class="scores-leaderboard-viewport scrollbar-none"
        tabindex="-1"
        {@attach viewportAttachment}
      >
        <div class="scores-leaderboard-stack flex min-h-full flex-col">
          <div
            class="
              scores-leaderboard-header bg-background-l0 sticky top-0 z-20 hidden
              h-(--header-height) md:flex
            "
            {@attach headerRowAttachment}
          >
            <div
              class="
                group/graph bg-background-l0 sticky left-0 z-30 w-(--team-column-width) shrink-0
              "
            >
              <div class="bg-background-l1 h-full w-full rounded-t-3xl rounded-bl-xl">
                {@render graphPanel()}
              </div>
            </div>
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

          {@render children()}
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
    --row-gap: 4px;
    --row-height-full: 68px;
    --row-height: calc(var(--row-height-full) - var(--row-gap));
    --cell-width: 48px;
    --header-height: 192px;
    --name-row-height: 128px;
    --diagonal-overflow: 96px;
    --team-column-width: 100%;
    --content-column-width: 0px;
    --score-content-width: calc(
      var(--score-cell-count, 0) * (var(--cell-width) + var(--row-gap)) + var(--diagonal-overflow)
    );
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

  .scores-leaderboard-viewport {
    height: 100%;
    overflow: auto;
    outline: none;
    overscroll-behavior: contain;
    scroll-padding-top: var(--score-scroll-padding-top);
  }

  .scores-leaderboard-stack,
  .scores-leaderboard-header {
    width: 100%;
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

    .scores-leaderboard-viewport {
      scroll-padding-left: var(--team-column-width);
    }

    .scores-leaderboard-stack {
      width: calc(var(--team-column-width) + var(--score-content-width));
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
