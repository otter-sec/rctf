<!--
  A pinned copy of the logged-in team's row, stuck to the top or bottom edge of
  the leaderboard scroll region whenever their real row is off screen (or on a
  page that has not loaded yet). It is a flex sibling of the virtual list: the
  bottom variant flows after the list (margin-block-start: auto) and sticks to
  the viewport bottom; the top variant flows before the list and cancels its own
  layout space with a negative margin so the rows beneath stay put. It reuses
  ScoresTeamRow + ScoresSolveCells with the same props a normal row gets, so the
  delegated cell tooltips keep working.
-->
<script lang="ts">
  import type { PinnedEdge } from '$lib/components/pinned-self-row'
  import type { LeaderboardEntry } from '$lib/query/leaderboard'
  import type { ScoresData } from '../model/data.svelte'
  import ScoresSolveCells from './solve-cells.svelte'
  import ScoresTeamRow from './team-row.svelte'
  import type { SortMode, ViewMode } from './url-params'

  interface Props {
    data: ScoresData
    entry: LeaderboardEntry
    index: number
    edge: PinnedEdge
    viewMode: ViewMode
    sortMode: SortMode
    divisions: Record<string, string>
    showDivision: boolean
    hoveredColumnId: string | null
  }

  let {
    data,
    entry,
    index,
    edge,
    viewMode,
    sortMode,
    divisions,
    showDivision,
    hoveredColumnId,
  }: Props = $props()
</script>

<self-row data-edge={edge} data-team-id={entry.id}>
  <row-team data-current>
    <ScoresTeamRow {data} {entry} {index} {divisions} {showDivision} />
  </row-team>
  <row-content data-current>
    <ScoresSolveCells {data} {entry} {viewMode} {sortMode} {hoveredColumnId} />
  </row-content>
</self-row>

<style>
  self-row {
    position: sticky;
    z-index: 15;
    display: flex;
    flex-shrink: 0;
    block-size: var(--score-row-height-full);
    background: var(--background-l0);
    contain: layout style;

    &[data-edge='top'] {
      inset-block-start: 0;
      margin-block-end: calc(-1 * var(--score-row-height-full));
      padding-block-end: var(--score-row-gap);
    }

    /* Card top-aligned in the 68px box (gap below, like a real row slot) so the
       pinned copy overlays the real row exactly at the engagement edge. */
    &[data-edge='bottom'] {
      inset-block-end: 0;
      margin-block-start: auto;
      padding-block-end: var(--score-row-gap);
    }
  }

  /* Same two paint layers as the leaderboard rows: the element is opaque page
     background so the sticky column fully occludes cells passing beneath its
     rounded corners; ::before is the rounded card surface. */
  row-team {
    --rank-fg-l0: var(--foreground-self-l0);
    --rank-fg-l1: var(--foreground-self-l1);
    --rank-glow: color-mix(in oklab, var(--foreground-self-l0) 15%, transparent);
    position: relative;
    z-index: 0;
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    flex-shrink: 0;
    inline-size: var(--score-team-column-width);
    block-size: var(--score-row-height);
    padding-inline: 1rem;
    background: var(--background-l0);

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      z-index: -1;
      background: var(--background-self-l0);
      border-radius: var(--radius-lg);
    }
  }

  row-content {
    display: none;
  }

  @media (width >= 48rem) {
    self-row[data-edge='top'] {
      inset-block-start: var(--score-header-height);
    }

    row-team {
      position: sticky;
      inset-inline-start: 0;
      z-index: 10;

      &::before {
        border-start-end-radius: 0;
        border-end-end-radius: 0;
      }
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
