<script lang="ts">
  import type { LeaderboardEntry } from '$lib/query/leaderboard'
  import type { ScoresData } from './scores-data.svelte'
  import {
    getChallengeCellWidth,
    isDynamicChallenge,
    type CategoryGroup,
    type ChallengeInfo,
  } from './scores-transforms'
  import type { ViewMode } from './scores-url-params'

  interface Props {
    data: ScoresData
    entry: LeaderboardEntry
    viewMode: ViewMode
  }

  let { data, entry, viewMode }: Props = $props()

  // Filled droplet-with-numeral medals for first/second/third blood, colored via
  // currentColor from the cell's [data-blood] token.
  const BLOOD_PATHS = [
    'M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2m.994 5.886c-.083-.777-1.008-1.16-1.617-.67l-.084.077l-2 2l-.083.094a1 1 0 0 0 0 1.226l.083.094l.094.083a1 1 0 0 0 1.226 0l.094-.083l.293-.293V16l.007.117a1 1 0 0 0 1.986 0L13 16V8z',
    'M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2m1 5h-3l-.117.007a1 1 0 0 0 0 1.986L10 9h3v2h-2l-.15.005a2 2 0 0 0-1.844 1.838L9 13v2l.005.15a2 2 0 0 0 1.838 1.844L11 17h3l.117-.007a1 1 0 0 0 0-1.986L14 15h-3v-2h2l.15-.005a2 2 0 0 0 1.844-1.838L15 11V9l-.005-.15a2 2 0 0 0-1.838-1.844z',
    'M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2m1 5h-2l-.15.005A2 2 0 0 0 9 9a1 1 0 0 0 1.974.23l.02-.113L11 9h2v2h-2l-.133.007c-1.111.12-1.154 1.73-.128 1.965l.128.021L11 13h2v2h-2l-.007-.117A1 1 0 0 0 9 15a2 2 0 0 0 1.85 1.995L11 17h2l.15-.005a2 2 0 0 0 1.844-1.838L15 15v-2l-.005-.15a2 2 0 0 0-.17-.667l-.075-.152l-.019-.032l.02-.03a2 2 0 0 0 .242-.795L15 11V9l-.005-.15a2 2 0 0 0-1.838-1.844z',
  ] as const

  const CHECK_PATH =
    'M17 3.34a10 10 0 1 1-14.995 8.984L2 12l.005-.324A10 10 0 0 1 17 3.34m-1.293 5.953a1 1 0 0 0-1.32-.083l-.094.083L11 12.585l-1.293-1.292l-.094-.083a1 1 0 0 0-1.403 1.403l.083.094l2 2l.094.083a1 1 0 0 0 1.226 0l.094-.083l4-4l.083-.094a1 1 0 0 0-.083-1.32'

  const RING_RADIUS = 8.75
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

  const solves = $derived(data.solvesByTeam.get(entry.id) ?? null)
  const solveTimes = $derived(data.solveTimesByTeam.get(entry.id) ?? null)
  const points = $derived(data.challengePointsByTeam.get(entry.id) ?? null)
  const pointDeltas = $derived(data.challengePointDeltasByTeam.get(entry.id) ?? null)

  interface ChallengeCell {
    id: string
    name: string
    points: number
    width: number
    dynamic: boolean
    solved: boolean
    blood: number
    solveTime: number | undefined
    teamPoints: number
    pointDelta: number
  }

  const challengeCells = $derived.by((): ChallengeCell[] =>
    data.challenges.map((challenge: ChallengeInfo) => {
      const dynamic = isDynamicChallenge(challenge)
      return {
        id: challenge.id,
        name: challenge.name,
        points: challenge.points,
        width: getChallengeCellWidth(challenge),
        dynamic,
        solved: solves?.has(challenge.id) ?? false,
        blood: dynamic ? -1 : data.getBloodIndex(challenge.id, entry.id),
        solveTime: solveTimes?.get(challenge.id),
        teamPoints: points?.get(challenge.id) ?? 0,
        pointDelta: pointDeltas?.get(challenge.id) ?? 0,
      }
    })
  )

  interface CategoryCell {
    key: string
    name: string
    solved: number
    total: number
    percent: number
    state: 'full' | 'partial' | 'none' | 'all-dynamic'
  }

  const categoryCells = $derived.by((): CategoryCell[] =>
    data.categoryGroups.map((group: CategoryGroup) => {
      const stats = data.getCategoryStatsForSolves(solves, group)
      return {
        key: group.category,
        name: group.config.name,
        solved: stats.solved,
        total: stats.total,
        percent: stats.percent,
        state: stats.state,
      }
    })
  )

  function deltaTrend(delta: number): 'positive' | 'negative' | 'neutral' {
    if (delta > 0) return 'positive'
    if (delta < 0) return 'negative'
    return 'neutral'
  }
</script>

<solve-cells>
  {#if viewMode === 'categories'}
    {#each categoryCells as cell (cell.key)}
      <solve-cell
        data-tooltip-cell
        data-kind="category"
        data-name={cell.name}
        data-solved={cell.solved}
        data-total={cell.total}
        data-cat-state={cell.state}
      >
        {#if cell.state === 'full'}
          <svg viewBox="0 0 24 24" data-mark="check"
            ><path fill="currentColor" d={CHECK_PATH} /></svg
          >
        {:else if cell.state === 'partial'}
          <svg viewBox="0 0 24 24" data-mark="ring">
            <g transform="rotate(-90 12 12)">
              <circle cx="12" cy="12" r={RING_RADIUS} data-track />
              <circle
                cx="12"
                cy="12"
                r={RING_RADIUS}
                data-progress
                stroke-dasharray={RING_CIRCUMFERENCE}
                stroke-dashoffset={RING_CIRCUMFERENCE * (1 - cell.percent / 100)}
              />
            </g>
          </svg>
        {:else if cell.state === 'all-dynamic'}
          <cell-dash></cell-dash>
        {:else}
          <cell-circle data-unsolved></cell-circle>
        {/if}
      </solve-cell>
    {/each}
  {:else}
    {#each challengeCells as cell (cell.id)}
      {#if cell.dynamic}
        <solve-cell
          data-tooltip-cell
          data-kind="challenge"
          data-dynamic
          data-name={cell.name}
          data-points={cell.points}
          data-team-points={cell.teamPoints}
          data-point-delta={cell.pointDelta}
          style:--cell-width={`${cell.width}px`}
        >
          <dyn-points>
            <dyn-value>{cell.teamPoints.toLocaleString()} <span>pts</span></dyn-value>
            <dyn-delta data-trend={deltaTrend(cell.pointDelta)}>
              {#if cell.pointDelta > 0}&#9650;{:else if cell.pointDelta < 0}&#9660;{/if}
              {Math.abs(cell.pointDelta).toLocaleString()} pts
            </dyn-delta>
          </dyn-points>
        </solve-cell>
      {:else}
        <solve-cell
          data-tooltip-cell
          data-kind="challenge"
          data-name={cell.name}
          data-points={cell.points}
          data-state={cell.solved ? 'solved' : 'unsolved'}
          data-blood={cell.blood >= 0 ? cell.blood + 1 : undefined}
          data-solve-time={cell.solveTime}
          style:--cell-width={`${cell.width}px`}
        >
          {#if cell.blood >= 0 && cell.blood < 3}
            <svg viewBox="0 0 24 24" data-mark="blood" data-medal={cell.blood + 1}>
              <path fill="currentColor" d={BLOOD_PATHS[cell.blood]} />
            </svg>
          {:else if cell.solved}
            <cell-circle data-solved></cell-circle>
          {:else}
            <cell-circle data-unsolved></cell-circle>
          {/if}
        </solve-cell>
      {/if}
    {/each}
  {/if}
</solve-cells>

<style>
  solve-cells {
    display: flex;
    gap: 4px;
    align-items: stretch;
    padding-inline-start: 0.25rem;
    padding-inline-end: var(--score-diagonal-overflow);
    block-size: 100%;
    content-visibility: auto;
    contain-intrinsic-size: auto 100% auto var(--score-row-height);
  }

  solve-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    inline-size: var(--cell-width, 48px);
    flex-shrink: 0;
  }

  cell-circle {
    inline-size: 1.25rem;
    block-size: 1.25rem;
    border-radius: var(--radius-full);
    box-sizing: border-box;

    &[data-solved] {
      border: 2px solid color-mix(in oklab, var(--foreground-success) 75%, transparent);
    }

    &[data-unsolved] {
      border: 2px dashed color-mix(in oklab, var(--foreground-l5) 25%, transparent);
    }
  }

  cell-dash {
    inline-size: 0.875rem;
    block-size: 2px;
    border-radius: var(--radius-full);
    background: color-mix(in oklab, var(--foreground-l5) 35%, transparent);
  }

  svg[data-mark] {
    inline-size: 1.5rem;
    block-size: 1.5rem;
  }

  svg[data-mark='check'] {
    color: var(--category-foreground-l1, var(--foreground-l1));
  }

  svg[data-mark='ring'] {
    color: var(--category-foreground-l1, var(--foreground-l1));

    circle {
      fill: none;
      stroke-width: 2.5;
    }

    circle[data-track] {
      stroke: color-mix(in oklab, var(--foreground-l5) 20%, transparent);
    }

    circle[data-progress] {
      stroke: currentColor;
      stroke-linecap: round;
    }
  }

  svg[data-mark='blood'][data-medal='1'] {
    color: var(--foreground-gold-l0);
  }

  svg[data-mark='blood'][data-medal='2'] {
    color: var(--foreground-silver-l0);
  }

  svg[data-mark='blood'][data-medal='3'] {
    color: var(--foreground-bronze-l0);
  }

  dyn-points {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.125rem;
    line-height: 1;
  }

  dyn-value {
    color: var(--foreground-l1);
    font-size: var(--step--1);
    font-variant-numeric: tabular-nums;

    span {
      color: var(--foreground-l3);
    }
  }

  dyn-delta {
    display: flex;
    align-items: center;
    gap: 0.125rem;
    font-size: var(--step--2);
    font-variant-numeric: tabular-nums;

    &[data-trend='positive'] {
      color: var(--foreground-success);
    }

    &[data-trend='negative'] {
      color: var(--foreground-destructive);
    }

    &[data-trend='neutral'] {
      color: var(--foreground-l3);
    }
  }
</style>
