<!--
  Windowed multi-line scoreboard graph. Hand-rolled SVG on top of the chart core
  (scale/ticks/path/nearest/y-ticks); no charting library. Draws the currently
  windowed teams' cumulative-score lines, dims top-3/self context lines, and
  cross-highlights on external hover (a hovered row/sparkline highlights its
  line; a hovered solve cell drops a crosshair on that team's line). The visible
  team set is resolved and frozen upstream (KTD-7 / AE5); this component only
  renders what it is handed.
-->
<script lang="ts">
  import Axis from '$lib/chart/axis.svelte'
  import ChartTooltip, { type TooltipRow } from '$lib/chart/chart-tooltip.svelte'
  import Crosshair from '$lib/chart/crosshair.svelte'
  import Line from '$lib/chart/line.svelte'
  import { nearestPoint, type Series } from '$lib/chart/nearest'
  import { createLinearScale, createTimeScale } from '$lib/chart/scale'
  import { ctfRelativeTicks } from '$lib/chart/ticks'
  import { niceLinearTicks } from '$lib/chart/y-ticks'
  import type { LeaderboardGraphSeries } from '$lib/query/leaderboard'
  import GraphControls from './scores-graph-controls.svelte'
  import { getRankTier } from './scores-transforms'

  interface Props {
    graphData: LeaderboardGraphSeries[]
    visibleTeamIds: Set<string>
    contextTeamIds: Set<string>
    teamRanks: Map<string, number>
    selfId: string | null
    startTime: number
    hoveredTeamId: string | null
    solveHighlight: { teamId: string; time: number } | null
    showTop3Context: boolean
    showSelfContext: boolean
    onToggleTop3: () => void
    onToggleSelf: () => void
  }

  let {
    graphData,
    visibleTeamIds,
    contextTeamIds,
    teamRanks,
    selfId,
    startTime,
    hoveredTeamId,
    solveHighlight,
    showTop3Context,
    showSelfContext,
    onToggleTop3,
    onToggleSelf,
  }: Props = $props()

  const PAD_TOP = 8
  const PAD_RIGHT = 8
  const PAD_BOTTOM = 24
  const PAD_LEFT = 8

  let width = $state(0)
  let height = $state(0)
  let hover = $state<{ x: number; y: number } | null>(null)

  interface WindowedSeries {
    id: string
    name: string
    role: string
    rank: number
    isSelf: boolean
    isContext: boolean
    points: { time: number; score: number }[]
  }

  // Sorted once per data change; `windowed` recomputes on every visibility
  // window change (scroll settle), which must not re-sort every series.
  const sortedSeries = $derived(
    graphData.map(entry => ({
      ...entry,
      points: [...entry.points].sort((a, b) => a.time - b.time),
    }))
  )

  const windowed = $derived.by<WindowedSeries[]>(() => {
    const out: WindowedSeries[] = []
    for (const entry of sortedSeries) {
      if (!visibleTeamIds.has(entry.id)) continue
      const isSelf = entry.id === selfId
      const rank = teamRanks.get(entry.id) ?? 0
      out.push({
        id: entry.id,
        name: entry.name,
        role: getRankTier(isSelf, rank, entry.id),
        rank,
        isSelf,
        isContext: contextTeamIds.has(entry.id),
        points: entry.points,
      })
    }
    return out
  })

  const maxScore = $derived.by(() => {
    let max = 0
    for (const entry of windowed) for (const point of entry.points) max = Math.max(max, point.score)
    return max
  })

  const maxTime = $derived.by(() => {
    let max = -Infinity
    for (const entry of windowed) for (const point of entry.points) max = Math.max(max, point.time)
    return max
  })

  const xMax = $derived(Number.isFinite(maxTime) ? Math.max(maxTime, startTime) : startTime)
  const yTicks = $derived(niceLinearTicks(maxScore, 4))

  const innerLeft = PAD_LEFT
  const innerRight = $derived(Math.max(PAD_LEFT, width - PAD_RIGHT))
  const innerBottom = $derived(Math.max(PAD_TOP, height - PAD_BOTTOM))

  const xScale = $derived(createTimeScale([startTime, xMax], [innerLeft, innerRight]))
  const yScale = $derived(createLinearScale([0, yTicks.max], [innerBottom, PAD_TOP]))
  const xTicks = $derived(ctfRelativeTicks(startTime, xMax, 7))

  interface RenderSeries extends WindowedSeries {
    width: number
    opacity: number
    scaled: { x: number; y: number }[]
    data: { x: number; y: number }[]
  }

  // Coordinate mapping depends only on data and scales; hover (which changes
  // on every pointermove) must only re-run the cheap opacity/draw-order pass.
  const scaledSeries = $derived(
    windowed.map(entry => ({
      ...entry,
      width: entry.isSelf ? 3 : 2,
      scaled: entry.points.map(p => ({ x: xScale(p.time), y: yScale(p.score) })),
      data: entry.points.map(p => ({ x: p.time, y: p.score })),
    }))
  )

  const renderSeries = $derived.by<RenderSeries[]>(() => {
    const out = scaledSeries.map(entry => {
      const dimmed = hoveredTeamId !== null && hoveredTeamId !== entry.id && !entry.isSelf
      return { ...entry, opacity: dimmed ? 0.15 : entry.isContext ? 0.3 : 1 }
    })
    // Draw order: the hovered line on top, then self, then higher ranks last so
    // the leaders sit above the pack.
    return out.sort((a, b) => {
      const ah = a.id === hoveredTeamId
      const bh = b.id === hoveredTeamId
      if (ah !== bh) return ah ? 1 : -1
      if (a.isSelf !== b.isSelf) return a.isSelf ? 1 : -1
      return b.rank - a.rank
    })
  })

  // Hit-test against the pre-scaled pixel points (identity scales) so each
  // pointermove is a plain distance scan, not a re-projection of every sample;
  // the raw time/score comes back via the index-aligned `data` array.
  const nearest = $derived.by(() => {
    if (!hover || renderSeries.length === 0) return null
    const series: Series[] = renderSeries.map(s => ({ id: s.id, points: s.scaled }))
    return nearestPoint(
      series,
      hover.x,
      hover.y,
      px => px,
      px => px
    )
  })

  const hoveredSeries = $derived(
    nearest ? (renderSeries.find(s => s.id === nearest.seriesId) ?? null) : null
  )
  const hoverPx = $derived(nearest ? nearest.point : null)
  const tooltipRows = $derived<TooltipRow[]>(
    nearest && hoveredSeries
      ? [
          {
            role: hoveredSeries.role,
            name: hoveredSeries.name,
            score: hoveredSeries.data[nearest.index]?.y ?? 0,
            time: hoveredSeries.data[nearest.index]?.x ?? 0,
          },
        ]
      : []
  )

  // The solve crosshair pins to the hovered cell's team line: exact time match
  // when the sample exists, otherwise the nearest sample in time.
  const solvePoint = $derived.by(() => {
    if (!solveHighlight) return null
    const series = renderSeries.find(s => s.id === solveHighlight.teamId)
    if (!series || series.data.length === 0) return null
    let best = series.data[0]!
    for (const point of series.data) {
      if (point.x === solveHighlight.time) {
        best = point
        break
      }
      if (Math.abs(point.x - solveHighlight.time) < Math.abs(best.x - solveHighlight.time)) {
        best = point
      }
    }
    return { role: series.role, x: xScale(best.x), y: yScale(best.y) }
  })

  const ariaLabel = $derived(
    `Cumulative score graph showing ${renderSeries.length} team${
      renderSeries.length === 1 ? '' : 's'
    }`
  )

  function handleMove(event: PointerEvent) {
    const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect()
    hover = { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  function handleLeave() {
    hover = null
  }
</script>

<graph-root>
  <div data-graph-viewport bind:clientWidth={width} bind:clientHeight={height}>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <svg
      role="img"
      tabindex="0"
      aria-label={ariaLabel}
      {width}
      {height}
      onpointermove={handleMove}
      onpointerleave={handleLeave}
    >
      <!-- No data yet (skeleton): xMax collapses to startTime and every tick
           would land on the same x, stacking the labels in the corner. -->
      {#if renderSeries.length > 0}
        <Axis ticks={xTicks} scale={xScale} y={innerBottom} left={innerLeft} right={innerRight} />
      {/if}

      {#each renderSeries as series (series.id)}
        <g data-series-role={series.role}>
          <Line points={series.scaled} width={series.width} opacity={series.opacity} />
        </g>
      {/each}

      {#if solvePoint}
        <g data-series-role={solvePoint.role}>
          <Crosshair
            x={solvePoint.x}
            y={solvePoint.y}
            top={PAD_TOP}
            bottom={innerBottom}
            left={innerLeft}
            right={innerRight}
          />
        </g>
      {/if}

      {#if hoverPx && hoveredSeries}
        <line data-hover-crosshair x1={hoverPx.x} y1={PAD_TOP} x2={hoverPx.x} y2={innerBottom} />
        <g data-series-role={hoveredSeries.role}>
          <circle data-hover-dot cx={hoverPx.x} cy={hoverPx.y} r="3.5" fill="currentColor" />
        </g>
        <ChartTooltip
          x={hoverPx.x}
          y={hoverPx.y}
          chartWidth={width}
          chartHeight={height}
          rows={tooltipRows}
          {startTime}
        />
      {/if}
    </svg>
  </div>

  <graph-controls-slot>
    <GraphControls {showTop3Context} {showSelfContext} {onToggleTop3} {onToggleSelf} />
  </graph-controls-slot>
</graph-root>

<style>
  graph-root {
    position: relative;
    display: block;
    inline-size: 100%;
    block-size: 100%;
  }

  [data-graph-viewport] {
    inline-size: 100%;
    block-size: 100%;
  }

  svg {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    outline-offset: -2px;
  }

  [data-hover-crosshair] {
    stroke: var(--foreground-l5);
    stroke-width: 1;
    stroke-dasharray: 3 3;
  }

  [data-hover-dot] {
    stroke: var(--background-l1);
    stroke-width: 2;
  }

  graph-controls-slot {
    position: absolute;
    inset-block-start: var(--space-2xs);
    inset-inline-end: var(--space-2xs);
    opacity: 0;
    transition: opacity 120ms ease;

    graph-root:hover &,
    graph-root:focus-within & {
      opacity: 1;
    }
  }
</style>
