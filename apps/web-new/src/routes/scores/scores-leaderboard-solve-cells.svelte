<script lang="ts">
  import IconTriangleFilled from '$lib/icons/icon-triangle-filled.svelte'
  import IconTriangleInvertedFilled from '$lib/icons/icon-triangle-inverted-filled.svelte'
  import type { LeaderboardEntry } from '$lib/query/leaderboard'
  import type { ScoresData } from './scores-data.svelte'
  import { BLOOD_PATHS, CHECK_PATH } from './scores-leaderboard-cell-icons'
  import { CELL_KIND, pointDeltaTrend } from './scores-leaderboard-cell-tooltip'
  import {
    getChallengeCellWidth,
    getTeamSolveLookups,
    isDynamicChallenge,
    type CategoryGroup,
    type ChallengeInfo,
  } from './scores-transforms'
  import type { SortMode, ViewMode } from './scores-url-params'

  interface Props {
    data: ScoresData
    entry: LeaderboardEntry
    viewMode: ViewMode
    sortMode: SortMode
    hoveredColumnId: string | null
  }

  let { data, entry, viewMode, sortMode, hoveredColumnId }: Props = $props()

  const RING_RADIUS = 8.75
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

  const lookups = $derived(getTeamSolveLookups(entry))

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
        solved: lookups.solvedIds.has(challenge.id),
        blood: dynamic ? -1 : data.getBloodIndex(challenge.id, entry.id),
        solveTime: lookups.solveTimes.get(challenge.id),
        teamPoints: lookups.dynamicPoints.get(challenge.id) ?? 0,
        pointDelta: lookups.dynamicPointDeltas.get(challenge.id) ?? 0,
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
      const stats = data.getCategoryStatsForSolves(lookups.solvedIds, group)
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

  // Category-grouped challenge cells share one faint background stripe per
  // group (the old app's per-category rects); ungrouped modes stripe per cell.
  const challengeCellGroups = $derived.by((): { key: string; cells: ChallengeCell[] }[] | null => {
    if (viewMode === 'categories' || sortMode !== 'categories') return null
    const groups: { key: string; cells: ChallengeCell[] }[] = []
    let offset = 0
    for (const group of data.categoryGroups) {
      groups.push({
        key: group.category,
        cells: challengeCells.slice(offset, offset + group.challenges.length),
      })
      offset += group.challenges.length
    }
    return groups
  })
</script>

{#snippet challengeCell(cell: ChallengeCell)}
  {#if cell.dynamic}
    <solve-cell
      data-tooltip-cell
      data-kind={CELL_KIND.challenge}
      data-col={cell.id}
      data-col-hover={hoveredColumnId === cell.id || undefined}
      data-dynamic
      data-name={cell.name}
      data-points={cell.points}
      data-team-points={cell.teamPoints}
      data-point-delta={cell.pointDelta}
      data-stripe={challengeCellGroups ? undefined : ''}
      style:--cell-width={`${cell.width}px`}
    >
      <dyn-points>
        <dyn-value>{cell.teamPoints.toLocaleString()} <span>pts</span></dyn-value>
        <dyn-delta data-trend={pointDeltaTrend(cell.pointDelta)}>
          {#if cell.pointDelta > 0}
            <IconTriangleFilled data-icon />
          {:else if cell.pointDelta < 0}
            <IconTriangleInvertedFilled data-icon />
          {/if}
          {Math.abs(cell.pointDelta).toLocaleString()} pts
        </dyn-delta>
      </dyn-points>
    </solve-cell>
  {:else}
    <solve-cell
      data-tooltip-cell
      data-kind={CELL_KIND.challenge}
      data-col={cell.id}
      data-col-hover={hoveredColumnId === cell.id || undefined}
      data-name={cell.name}
      data-points={cell.points}
      data-state={cell.solved ? 'solved' : 'unsolved'}
      data-blood={cell.blood >= 0 ? cell.blood + 1 : undefined}
      data-solve-time={cell.solveTime}
      data-stripe={challengeCellGroups ? undefined : ''}
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
{/snippet}

<solve-cells>
  {#if viewMode === 'categories'}
    {#each categoryCells as cell (cell.key)}
      <solve-cell
        data-tooltip-cell
        data-kind={CELL_KIND.category}
        data-col={cell.key}
        data-col-hover={hoveredColumnId === cell.key || undefined}
        data-name={cell.name}
        data-solved={cell.solved}
        data-total={cell.total}
        data-cat-state={cell.state}
        data-stripe
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
  {:else if challengeCellGroups}
    {#each challengeCellGroups as group (group.key)}
      <cell-group>
        {#each group.cells as cell (cell.id)}
          {@render challengeCell(cell)}
        {/each}
      </cell-group>
    {/each}
  {:else}
    {#each challengeCells as cell (cell.id)}
      {@render challengeCell(cell)}
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

  /* Alternating stripes differentiate adjacent categories (grouped mode) or
     adjacent cells (ungrouped modes). */
  cell-group {
    display: flex;
    gap: 4px;
    flex-shrink: 0;

    &:nth-of-type(odd) {
      background: color-mix(in oklab, var(--foreground-l0) 4%, transparent);
    }
  }

  solve-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    inline-size: var(--cell-width, 48px);
    flex-shrink: 0;

    &[data-stripe]:nth-of-type(odd) {
      background: color-mix(in oklab, var(--foreground-l0) 4%, transparent);
    }

    /* Column echo: every cell sharing the hovered cell's column lights one
       tone above the stripe, so the eye can trace up to the header label.
       [data-tooltip-cell] ties this selector's specificity with the stripe
       rule; source order lets it win. */
    &[data-tooltip-cell][data-col-hover] {
      background: color-mix(in oklab, var(--foreground-l0) 8%, transparent);
    }

    /* One tone above the column echo so the hovered cell itself still reads
       inside a lit column. */
    &[data-tooltip-cell]:hover {
      background: color-mix(in oklab, var(--foreground-l0) 12%, transparent);
    }
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

    /* Same triangle sizing as the team-row and challenge point-delta chips. */
    :global(svg[data-icon]) {
      flex-shrink: 0;
      inline-size: 0.625rem;
      block-size: 0.625rem;
    }

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
