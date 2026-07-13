<script lang="ts">
  import type { LeaderboardEntry } from '$lib/query/leaderboard'
  import type { ScoresData } from '../model/data.svelte'
  import { getRankVariant } from '../model/transforms'
  import { SCORE_ROW_HEIGHT_FULL_PX } from './constants'
  import ScoresSolveCells from './solve-cells.svelte'
  import ScoresTeamRow from './team-row.svelte'
  import type { SortMode, ViewMode } from './url-params'

  interface Props {
    data: ScoresData
    entry: LeaderboardEntry
    index: number
    viewMode: ViewMode
    sortMode: SortMode
    focusedChallengeId: string | null
    divisions: Record<string, string>
    showDivision: boolean
    hoveredColumnId: string | null
    hovered: boolean
  }

  let {
    data,
    entry,
    index,
    viewMode,
    sortMode,
    focusedChallengeId,
    divisions,
    showDivision,
    hoveredColumnId,
    hovered,
  }: Props = $props()

  const variant = $derived(getRankVariant(entry.globalPlace ?? index + 1, true))

  const slotOffset = $derived(index * SCORE_ROW_HEIGHT_FULL_PX)
</script>

<self-row-track>
  <self-row-spacer style:block-size={`${slotOffset}px`}></self-row-spacer>
  <self-row data-team-id={entry.id}>
    <row-team data-current data-rank={variant}>
      <ScoresTeamRow {data} {entry} {index} {divisions} {showDivision} />
    </row-team>
    <row-content data-current data-hovered={hovered || undefined}>
      <ScoresSolveCells
        {data}
        {entry}
        {viewMode}
        {sortMode}
        {focusedChallengeId}
        {hoveredColumnId}
      />
    </row-content>
  </self-row>
</self-row-track>

<style>
  self-row-track {
    position: absolute;
    inset: 0;
    z-index: 15;
    display: block;
    pointer-events: none;

    @media (width >= 48rem) {
      padding-block-start: var(--score-header-height);
    }
  }

  self-row-spacer {
    display: block;
  }

  self-row {
    position: sticky;
    inset-block-start: 0;
    inset-block-end: 0;
    display: flex;
    block-size: var(--score-row-height-full);
    padding-block-end: var(--score-row-gap);
    background: var(--background-l0);
    contain: layout style;
    pointer-events: auto;

    &:has(:global(a:focus-visible))::after {
      content: '';
      position: absolute;
      inset: 0 0 var(--score-row-gap) 0;
      z-index: 11;
      border: 2px solid var(--ring);
      border-radius: var(--radius-lg);
      pointer-events: none;
    }

    @media (width >= 48rem) {
      inset-block-start: var(--score-header-height);
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

    &::before,
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      z-index: -1;
      border-radius: var(--radius-lg);
    }

    &::before {
      background: var(--background-self-l0);
    }

    &::after {
      inline-size: min(24rem, 100%);
      background: linear-gradient(to right, var(--rank-glow), transparent);
    }

    &[data-rank='first'] {
      --rank-fg-l0: var(--foreground-gold-l0);
      --rank-fg-l1: var(--foreground-gold-l1);
      --rank-glow: var(--background-gold);
    }

    &[data-rank='second'] {
      --rank-fg-l0: var(--foreground-silver-l0);
      --rank-fg-l1: var(--foreground-silver-l1);
      --rank-glow: var(--background-silver);
    }

    &[data-rank='third'] {
      --rank-fg-l0: var(--foreground-bronze-l0);
      --rank-fg-l1: var(--foreground-bronze-l1);
      --rank-glow: var(--background-bronze);
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
