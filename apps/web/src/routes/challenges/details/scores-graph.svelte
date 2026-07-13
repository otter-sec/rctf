<script lang="ts">
  import Axis from '$lib/chart/axis.svelte'
  import ChartTooltip, {
    type TooltipRow,
  } from '$lib/chart/chart-tooltip.svelte'
  import Line from '$lib/chart/line.svelte'
  import { nearestPoint, type Series } from '$lib/chart/nearest'
  import { createLinearScale, createTimeScale } from '$lib/chart/scale'
  import { ctfRelativeTicks } from '$lib/chart/ticks'
  import { getRankTier } from '../../scores/model/transforms'
  import GraphControls from './scores-graph-controls.svelte'

  interface GraphEntry {
    id: string
    name: string
    points: { time: number; score: number }[]
  }

  interface Props {
    graph: GraphEntry[]
    visibleTeamIds: Set<string>
    hoveredTeamId?: string | null
    selfId?: string | null
    startTime: number
    endTime: number
  }

  let {
    graph,
    visibleTeamIds,
    hoveredTeamId = null,
    selfId = null,
    startTime,
    endTime,
  }: Props = $props()

  let pinTop3 = $state(true)
  let pinSelf = $state(true)

  const HEIGHT = 176
  const PAD_TOP = 8
  const PAD_RIGHT = 8
  const PAD_BOTTOM = 24
  const PAD_LEFT = 8
  const TOP_N = 10

  let width = $state(0)
  let hover = $state<{ x: number; y: number } | null>(null)

  const ranked = $derived(
    graph
      .map(entry => ({ ...entry, finalScore: entry.points.at(-1)?.score ?? 0 }))
      .sort((a, b) => b.finalScore - a.finalScore || a.id.localeCompare(b.id))
      .map((entry, index) => ({ ...entry, rank: index + 1 }))
  )

  const rankedIds = $derived(new Set(ranked.map(entry => entry.id)))

  const focusIds = $derived(
    visibleTeamIds.size > 0
      ? visibleTeamIds
      : new Set(ranked.slice(0, TOP_N).map(entry => entry.id))
  )

  const renderedIds = $derived.by(() => {
    const ids = [...focusIds]
    if (pinTop3) ids.push(...ranked.slice(0, 3).map(entry => entry.id))
    if (pinSelf && selfId && rankedIds.has(selfId)) ids.push(selfId)
    return new Set(ids)
  })

  const rendered = $derived(ranked.filter(entry => renderedIds.has(entry.id)))

  const maxScore = $derived.by(() => {
    let max = 0
    for (const entry of rendered)
      for (const point of entry.points) max = Math.max(max, point.score)
    return max
  })

  const maxTime = $derived.by(() => {
    let max = -Infinity
    for (const entry of rendered)
      for (const point of entry.points) max = Math.max(max, point.time)
    return max
  })

  const xMax = $derived(
    Number.isFinite(maxTime)
      ? Math.max(maxTime, startTime)
      : Math.max(endTime, startTime)
  )
  const yMax = $derived(maxScore > 0 ? maxScore : 1)

  const innerLeft = PAD_LEFT
  const innerRight = $derived(Math.max(PAD_LEFT, width - PAD_RIGHT))
  const innerBottom = HEIGHT - PAD_BOTTOM

  const xScale = $derived(
    createTimeScale([startTime, xMax], [innerLeft, innerRight])
  )
  const yScale = $derived(createLinearScale([0, yMax], [innerBottom, PAD_TOP]))
  const ticks = $derived(ctfRelativeTicks(startTime, xMax, 7))

  interface ScaledSeries {
    id: string
    name: string
    role: string
    rank: number
    isSelf: boolean
    width: number
    baseOpacity: number
    points: { time: number; score: number }[]
    scaled: { x: number; y: number }[]
  }

  interface RenderSeries extends ScaledSeries {
    opacity: number
  }

  const scaledSeries = $derived.by<ScaledSeries[]>(() => {
    const out: ScaledSeries[] = []
    for (const entry of rendered) {
      const isSelf = entry.id === selfId
      out.push({
        id: entry.id,
        name: entry.name,
        role: getRankTier(isSelf, entry.rank, entry.id),
        rank: entry.rank,
        isSelf,
        width: isSelf ? 3 : 2,
        baseOpacity: isSelf || focusIds.has(entry.id) ? 1 : 0.3,
        points: entry.points,
        scaled: entry.points.map(p => ({
          x: xScale(p.time),
          y: yScale(p.score),
        })),
      })
    }
    return out
  })

  const renderSeries = $derived.by<RenderSeries[]>(() => {
    const out = scaledSeries.map(entry => {
      const dimmed =
        hoveredTeamId !== null && hoveredTeamId !== entry.id && !entry.isSelf
      return { ...entry, opacity: dimmed ? 0.15 : entry.baseOpacity }
    })
    return out.sort((a, b) => {
      const ah = a.id === hoveredTeamId
      const bh = b.id === hoveredTeamId
      if (ah !== bh) return ah ? 1 : -1
      if (a.isSelf !== b.isSelf) return a.isSelf ? 1 : -1
      return b.rank - a.rank
    })
  })

  const nearestSeries = $derived<Series[]>(
    scaledSeries.map(s => ({ id: s.id, points: s.scaled }))
  )

  const nearest = $derived.by(() => {
    if (!hover || nearestSeries.length === 0) return null
    return nearestPoint(nearestSeries, hover.x, hover.y)
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
            score: hoveredSeries.points[nearest.index]?.score ?? 0,
            time: hoveredSeries.points[nearest.index]?.time ?? 0,
          },
        ]
      : []
  )

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
  <div data-graph-viewport bind:clientWidth={width}>
    <svg
      role="img"
      aria-label={ariaLabel}
      {width}
      height={HEIGHT}
      onpointermove={handleMove}
      onpointerleave={handleLeave}
    >
      <Axis
        {ticks}
        scale={xScale}
        y={innerBottom}
        left={innerLeft}
        right={innerRight}
      />

      {#each renderSeries as series (series.id)}
        <g data-series-role={series.role}>
          <Line
            points={series.scaled}
            width={series.width}
            opacity={series.opacity}
          />
        </g>
      {/each}

      {#if hoverPx && hoveredSeries}
        <line
          data-crosshair
          x1={hoverPx.x}
          y1={PAD_TOP}
          x2={hoverPx.x}
          y2={innerBottom}
        />
        <g data-series-role={hoveredSeries.role}>
          <circle
            data-hover-dot
            cx={hoverPx.x}
            cy={hoverPx.y}
            r="3.5"
            fill="currentColor"
          />
        </g>
      {/if}
    </svg>
  </div>

  {#if hoverPx && hoveredSeries}
    <ChartTooltip
      x={hoverPx.x}
      y={hoverPx.y}
      chartWidth={width}
      chartHeight={HEIGHT}
      rows={tooltipRows}
      {startTime}
    />
  {/if}

  <graph-controls-slot>
    <GraphControls bind:pinTop3 bind:pinSelf />
  </graph-controls-slot>
</graph-root>

<style>
  graph-root {
    position: relative;
    display: block;
    inline-size: 100%;
  }

  [data-graph-viewport] {
    inline-size: 100%;
    block-size: 176px;
  }

  svg {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    outline-offset: -2px;
  }

  [data-crosshair] {
    stroke: var(--foreground-l5);
    stroke-width: 1;
    stroke-dasharray: 3 3;
  }

  [data-hover-dot] {
    stroke: var(--background-l0);
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
