<script lang="ts">
  import { ScrollArea } from '$lib/components'
  import type { Snippet } from 'svelte'
  import type { Attachment } from 'svelte/attachments'
  import ScoresChallengeHeader from './scores-leaderboard-challenge-header.svelte'
  import type { createScoresDataModel } from './scores-leaderboard-data-model.svelte'
  import ScoresFades from './scores-leaderboard-scroll-fades.svelte'
  import ScoresGraphControls from './scores-leaderboard-graph-controls.svelte'
  import ScoresGraph from './scores-leaderboard-graph.svelte'
  import type { createScoresRouteState } from './scores-page-url-state.svelte'
  import type { createScoresViewportState } from './scores-leaderboard-scroll-state.svelte'
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
  const selfRowAnchor = $derived(viewportState.showSelfRow ? viewportState.selfRowPosition : 'none')

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
  <ScoresGraph {...graphProps} />
{/snippet}

<score-frame>
  <score-shell
    self-row={selfRowAnchor}
    style:--score-content-width={viewportState.contentWidth + 'px'}
  >
    <ScoresFades
      showTop={viewportState.showTopFade}
      showBottom={viewportState.showBottomFade}
      showLeft={viewportState.showLeftFade}
      showRight={viewportState.showRightFade}
      showSelfRow={viewportState.showSelfRow}
      selfRowPosition={viewportState.selfRowPosition}
    />

    <mobile-graph>
      {@render graphPanel()}
    </mobile-graph>

    <score-scroll>
      <ScrollArea
        class="score-scroll-area"
        orientation={viewportState.isDesktop ? 'both' : 'vertical'}
        type={viewportState.isDesktop ? 'always' : 'auto'}
        fadeSize={0}
        bind:viewportRef={scroll.state.viewportRef}
        viewportTabIndex={-1}
        viewportClass="score-scroll-viewport"
        scrollbarXClasses="score-scrollbar x"
        scrollbarYClasses="score-scrollbar y"
      >
        <scroll-content>
          <header-spacer aria-hidden="true"></header-spacer>

          {@render children()}
        </scroll-content>
      </ScrollArea>
    </score-scroll>

    <header-row {@attach headerRowAttachment}>
      <header-graph-cell>
        <header-graph-panel>
          {@render graphPanel()}
        </header-graph-panel>
      </header-graph-cell>
      <header-challenges bind:this={headerChallengeScrollRef}>
        <header-challenge-content>
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
        </header-challenge-content>
      </header-challenges>
    </header-row>
  </score-shell>
</score-frame>

<style>
  score-frame {
    display: flex;
    justify-content: center;
    padding-inline: calc(var(--spacing) * 4);
  }

  score-shell {
    --score-app-header-height: calc(var(--spacing) * 18);
    --score-toolbar-height: calc(var(--spacing) * 24);
    --score-mobile-graph-gap: calc(var(--spacing) * 2);
    --score-page-bottom-gap: calc(var(--spacing) * 4);
    --score-row-gap: 4px;
    --score-row-height-full: 68px;
    --score-row-height: calc(var(--score-row-height-full) - var(--score-row-gap));
    --score-cell-width: 48px;
    --score-header-height: 192px;
    --score-name-row-height: 128px;
    --score-diagonal-overflow: 96px;
    --score-team-column-width: 100%;
    --score-content-column-width: 0px;
    --score-scroll-padding-top: 0px;
    --score-scrollbar-y-padding-top: 0px;
    --score-scrollbar-y-padding-bottom: var(--score-row-gap);
    --score-self-row-height: var(--score-row-height-full);
    --score-self-row-offset: 0px;
    --score-self-row-top-offset: 0px;
    display: block;
    position: relative;
    width: 100%;
    max-width: 100%;

    &[self-row='top'] {
      --score-self-row-top-offset: var(--score-row-height-full);
      --score-scroll-padding-top: calc(var(--score-row-height-full) + var(--score-row-gap));
      --score-scrollbar-y-padding-top: calc(var(--score-row-height-full) + var(--score-row-gap));
    }

    &[self-row='bottom'] {
      --score-self-row-offset: var(--score-row-height-full);
      --score-scrollbar-y-padding-bottom: calc(var(--score-row-height-full) + var(--score-row-gap));
    }

    mobile-graph {
      --score-graph-padding: calc(var(--spacing) * 3);
      position: relative;
      display: block;
      height: var(--score-header-height);
      margin-block-end: var(--score-mobile-graph-gap);
      background: var(--background-l1);
      border-radius: var(--radius-lg);
    }

    score-scroll {
      display: contents;
    }

    score-scroll :global(.score-scroll-area) {
      height: calc(
        100dvh - var(--score-app-header-height) - var(--score-toolbar-height) -
          var(--score-mobile-graph-gap) - var(--score-header-height) - var(--score-page-bottom-gap)
      );
    }

    score-scroll :global(.score-scroll-viewport) {
      scroll-padding-block-start: var(--score-scroll-padding-top);
    }

    score-scroll :global(.score-scrollbar.x) {
      display: none;
    }

    score-scroll :global(.score-scrollbar.y) {
      z-index: 40;
      padding-block-start: var(--score-scrollbar-y-padding-top);
      padding-block-end: var(--score-scrollbar-y-padding-bottom);
    }

    scroll-content {
      min-height: 100%;
      display: flex;
      flex-direction: column;
    }

    header-row,
    header-spacer {
      display: none;
    }

    header-graph-cell {
      position: relative;
      z-index: 30;
      flex-shrink: 0;
      width: var(--score-team-column-width);
      background: var(--background-l0);
      pointer-events: auto;
    }

    header-graph-panel {
      --score-graph-padding: calc(var(--spacing) * 3);
      display: block;
      width: 100%;
      height: 100%;
      background: var(--background-l1);
      border-start-start-radius: var(--radius-3xl);
      border-start-end-radius: var(--radius-3xl);
      border-end-start-radius: var(--radius-xl);
    }

    header-challenges {
      display: block;
      min-width: 0;
      flex: 1;
      overflow: hidden;
      pointer-events: auto;
    }

    header-challenge-content {
      display: block;
      width: max-content;
    }
  }

  @media (width >= 48rem) {
    score-frame {
      padding-inline: calc(var(--spacing) * 9);
    }

    score-shell {
      --score-toolbar-height: calc(var(--spacing) * 13);
      --score-mobile-graph-gap: 0px;
      --score-team-column-width: calc(60vw - calc(var(--spacing) * 18));
      --score-content-column-width: calc(40vw + calc(var(--spacing) * 18));
      --score-scroll-padding-top: var(--score-header-height);
      --score-scrollbar-y-padding-top: var(--score-header-height);
      width: fit-content;

      &[self-row='top'] {
        --score-scroll-padding-top: calc(
          var(--score-header-height) + var(--score-row-height-full) + var(--score-row-gap)
        );
        --score-scrollbar-y-padding-top: calc(
          var(--score-header-height) + var(--score-row-height-full) + var(--score-row-gap)
        );
      }

      mobile-graph {
        display: none;
      }

      score-scroll :global(.score-scroll-area) {
        height: calc(
          100dvh - var(--score-app-header-height) - var(--score-toolbar-height) -
            var(--score-page-bottom-gap)
        );
      }

      score-scroll :global(.score-scroll-viewport) {
        scroll-padding-inline-start: var(--score-team-column-width);
      }

      score-scroll :global(.score-scrollbar.x) {
        z-index: 40;
        display: flex;
        padding-inline-start: var(--score-team-column-width);
        margin-inline-end: calc(var(--spacing) * -2.5);
      }

      header-spacer {
        display: block;
        height: var(--score-header-height);
        flex-shrink: 0;
      }

      header-row {
        position: absolute;
        inset-inline: 0;
        inset-block-start: 0;
        z-index: 30;
        display: flex;
        height: var(--score-header-height);
        background: var(--background-l0);
        pointer-events: none;
      }
    }
  }

  @media (width >= 80rem) {
    score-shell {
      --score-team-column-width: calc(45vw - calc(var(--spacing) * 18));
      --score-content-column-width: calc(55vw + calc(var(--spacing) * 18));
    }
  }
</style>
