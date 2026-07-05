<!--
  A pinned copy of the logged-in team's row, held over the top or bottom edge of
  the leaderboard scroll region whenever their real row is off screen (or on a
  page that has not loaded yet). It reuses ScoresTeamRow + ScoresSolveCells with
  the same props a normal row gets, so the delegated cell tooltips keep working;
  when the self entry is not in the loaded pages the row model is derived from
  the current-user query and the solve strip renders empty.
-->
<script lang="ts">
  import type { PinnedEdge } from '$lib/components/pinned-self-row'
  import type { LeaderboardEntry } from '$lib/query/leaderboard'
  import type { ScoresData } from './scores-data.svelte'
  import ScoresSolveCells from './scores-solve-cells.svelte'
  import ScoresTeamRow from './scores-team-row.svelte'
  import type { ViewMode } from './scores-url-params'

  interface Props {
    data: ScoresData
    entry: LeaderboardEntry
    index: number
    edge: PinnedEdge
    headerHeight: number
    viewMode: ViewMode
    divisions: Record<string, string>
    showDivision: boolean
  }

  let { data, entry, index, edge, headerHeight, viewMode, divisions, showDivision }: Props =
    $props()
</script>

<self-row data-edge={edge} data-team-id={entry.id} style:--self-header-height={`${headerHeight}px`}>
  <row-team data-current>
    <ScoresTeamRow {data} {entry} {index} {divisions} {showDivision} />
  </row-team>
  <row-content data-current>
    <ScoresSolveCells {data} {entry} {viewMode} />
  </row-content>
</self-row>

<style>
  /* Pinned to the scroll viewport's top or bottom edge, sticky on both axes so
     the team cell keeps its sticky-left position and the solve strip scrolls
     horizontally in step with the matrix underneath. */
  self-row {
    position: sticky;
    inset-inline-start: 0;
    z-index: 15;
    display: flex;
    inline-size: 100%;
    block-size: var(--score-row-height-full);
    contain: layout style;

    &[data-edge='top'] {
      inset-block-start: var(--self-header-height);
      padding-block-end: var(--score-row-gap);
    }

    &[data-edge='bottom'] {
      inset-block-end: 0;
      padding-block-start: var(--score-row-gap);
    }
  }

  row-team {
    --rank-fg-l0: var(--foreground-self-l0);
    --rank-fg-l1: var(--foreground-self-l1);
    --rank-glow: color-mix(in oklab, var(--foreground-self-l0) 15%, transparent);
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    flex-shrink: 0;
    inline-size: var(--score-team-column-width);
    block-size: var(--score-row-height);
    padding-inline: var(--space-m);
    background: var(--background-self-l0);
    border-radius: var(--radius-lg);
  }

  row-content {
    display: none;
  }

  @media (width >= 48rem) {
    row-team {
      position: sticky;
      inset-inline-start: 0;
      z-index: 10;
      border-start-end-radius: 0;
      border-end-end-radius: 0;
    }

    row-content {
      display: block;
      flex-shrink: 0;
      inline-size: var(--score-content-width);
      block-size: var(--score-row-height);
      background: var(--background-self-l0);
      border-start-end-radius: var(--radius-lg);
      border-end-end-radius: var(--radius-lg);
    }
  }
</style>
