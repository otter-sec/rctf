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
    focusedChallengeId: string | null
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
    focusedChallengeId,
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
    <ScoresSolveCells {data} {entry} {viewMode} {sortMode} {focusedChallengeId} {hoveredColumnId} />
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

    &:has(:global(a:focus-visible)) {
      outline: 2px solid var(--ring);
      outline-offset: -2px;
      border-radius: var(--radius-lg);
    }

    &[data-edge='top'] {
      inset-block-start: 0;
      margin-block-end: calc(-1 * var(--score-row-height-full));
      padding-block-end: var(--score-row-gap);
    }

    &[data-edge='bottom'] {
      inset-block-end: 0;
      margin-block-start: auto;
      padding-block-end: var(--score-row-gap);
    }

    @media (width >= 48rem) {
      &[data-edge='top'] {
        inset-block-start: var(--score-header-height);
      }
    }
  }

  row-team {
    --rank-fg-l0: var(--foreground-self-l0);
    --rank-fg-l1: var(--foreground-self-l1);
    --rank-glow: var(--jade-a3);
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

    @media (width >= 48rem) {
      position: sticky;
      inset-inline-start: 0;
      z-index: 10;

      &::before {
        border-start-end-radius: 0;
        border-end-end-radius: 0;
      }
    }
  }

  row-content {
    display: none;

    @media (width >= 48rem) {
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
