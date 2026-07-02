<!--
  Per-challenge cumulative-score graph. Hand-rolled SVG on top of the chart core
  (scale/ticks/path/nearest); no charting library. Renders the top-N series by
  final score, optionally pinning the top 3 and self even when they fall outside
  that window (dimmed when only pinned). Hover picks the nearest sample.
-->
<script lang="ts">
  import Axis from '$lib/chart/axis.svelte'
  import ChartTooltip, { type TooltipRow } from '$lib/chart/chart-tooltip.svelte'
  import Line from '$lib/chart/line.svelte'
  import { nearestPoint, type Series } from '$lib/chart/nearest'
  import { createLinearScale, createTimeScale } from '$lib/chart/scale'
  import { ctfRelativeTicks } from '$lib/chart/ticks'
  import GraphControls from './challenges-details-scores-graph-controls.svelte'

  interface GraphEntry {
    id: string
    name: string
    points: { time: number; score: number }[]
  }

  interface Props {
    graph: GraphEntry[]
    selfId?: string | null
    startTime: number
    endTime: number
    pinTop3?: boolean
    pinSelf?: boolean
  }

  let {
    graph,
    selfId = null,
    startTime,
    endTime,
    pinTop3 = $bindable(true),
    pinSelf = $bindable(true),
  }: Props = $props()

  const HEIGHT = 176
  const PAD_TOP = 8
  const PAD_RIGHT = 8
  const PAD_BOTTOM = 24
  const PAD_LEFT = 8
  const TOP_N = 10

  function seriesRole(isSelf: boolean, rank: number, id: string): string {
    if (isSelf) return 'self'
    if (rank === 1) return 'gold'
    if (rank === 2) return 'silver'
    if (rank === 3) return 'bronze'
    if (rank > 0) return `r${((rank - 1) % 10) + 1}`
    let hash = 0
    for (const ch of id) hash += ch.charCodeAt(0)
    return `r${(hash % 10) + 1}`
  }

  // Round the y-max up to a readable value (1/2/2.5/5 × 10^n) so the top of the
  // plot has a little headroom instead of clipping the leader's final point.
  function niceCeil(max: number): number {
    if (max <= 0) return 1
    const exp = Math.floor(Math.log10(max))
    const base = 10 ** exp
    const frac = max / base
    const niceFrac = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10
    return niceFrac * base
  }

  let width = $state(0)
  let hover = $state<{ x: number; y: number } | null>(null)

  const ranked = $derived(
    graph
      .map(entry => {
        const points = [...entry.points].sort((a, b) => a.time - b.time)
        const finalScore = points.at(-1)?.score ?? 0
        return { id: entry.id, name: entry.name, points, finalScore }
      })
      .sort((a, b) => b.finalScore - a.finalScore || a.id.localeCompare(b.id))
      .map((entry, index) => ({ ...entry, rank: index + 1 }))
  )

  const rankedIds = $derived(new Set(ranked.map(entry => entry.id)))
  const topIds = $derived(new Set(ranked.slice(0, TOP_N).map(entry => entry.id)))

  const renderedIds = $derived.by(() => {
    const ids = [...topIds]
    if (pinTop3) ids.push(...ranked.slice(0, 3).map(entry => entry.id))
    if (pinSelf && selfId && rankedIds.has(selfId)) ids.push(selfId)
    return new Set(ids)
  })

  const maxScore = $derived.by(() => {
    let max = 0
    for (const entry of ranked) for (const point of entry.points) max = Math.max(max, point.score)
    return max
  })

  const maxTime = $derived.by(() => {
    let max = -Infinity
    for (const entry of ranked) for (const point of entry.points) max = Math.max(max, point.time)
    return max
  })

  const xMax = $derived(
    Number.isFinite(maxTime) ? Math.max(maxTime, startTime) : Math.max(endTime, startTime)
  )
  const yMax = $derived(niceCeil(maxScore))

  const innerLeft = PAD_LEFT
  const innerRight = $derived(Math.max(PAD_LEFT, width - PAD_RIGHT))
  const innerBottom = HEIGHT - PAD_BOTTOM

  const xScale = $derived(createTimeScale([startTime, xMax], [innerLeft, innerRight]))
  const yScale = $derived(createLinearScale([0, yMax], [innerBottom, PAD_TOP]))
  const ticks = $derived(ctfRelativeTicks(startTime, xMax, 7))

  interface RenderSeries {
    id: string
    name: string
    role: string
    rank: number
    width: number
    opacity: number
    scaled: { x: number; y: number }[]
    data: { x: number; y: number }[]
  }

  const renderSeries = $derived.by<RenderSeries[]>(() => {
    const out: RenderSeries[] = []
    for (const entry of ranked) {
      if (!renderedIds.has(entry.id)) continue
      const isSelf = entry.id === selfId
      out.push({
        id: entry.id,
        name: entry.name,
        role: seriesRole(isSelf, entry.rank, entry.id),
        rank: entry.rank,
        width: isSelf ? 3 : 2,
        opacity: isSelf ? 1 : topIds.has(entry.id) ? 1 : 0.3,
        scaled: entry.points.map(p => ({ x: xScale(p.time), y: yScale(p.score) })),
        data: entry.points.map(p => ({ x: p.time, y: p.score })),
      })
    }
    // draw higher ranks (and self) last so they sit on top of the pack
    return out.sort((a, b) => {
      if ((a.id === selfId) !== (b.id === selfId)) return a.id === selfId ? 1 : -1
      return b.rank - a.rank
    })
  })

  const nearest = $derived.by(() => {
    if (!hover || renderSeries.length === 0) return null
    const series: Series[] = renderSeries.map(s => ({ id: s.id, points: s.data }))
    return nearestPoint(series, hover.x, hover.y, xScale, yScale)
  })

  const hoveredSeries = $derived(
    nearest ? (renderSeries.find(s => s.id === nearest.seriesId) ?? null) : null
  )
  const hoverPx = $derived(
    nearest ? { x: xScale(nearest.point.x), y: yScale(nearest.point.y) } : null
  )
  const tooltipRows = $derived<TooltipRow[]>(
    nearest && hoveredSeries
      ? [
          {
            role: hoveredSeries.role,
            name: hoveredSeries.name,
            score: nearest.point.y,
            time: nearest.point.x,
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
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <svg
      role="img"
      tabindex="0"
      aria-label={ariaLabel}
      {width}
      height={HEIGHT}
      onpointermove={handleMove}
      onpointerleave={handleLeave}
    >
      <Axis {ticks} scale={xScale} y={innerBottom} left={innerLeft} right={innerRight} />

      {#each renderSeries as series (series.id)}
        <g data-series-role={series.role}>
          <Line points={series.scaled} width={series.width} opacity={series.opacity} />
        </g>
      {/each}

      {#if hoverPx && hoveredSeries}
        <line data-crosshair x1={hoverPx.x} y1={PAD_TOP} x2={hoverPx.x} y2={innerBottom} />
        <g data-series-role={hoveredSeries.role}>
          <circle data-hover-dot cx={hoverPx.x} cy={hoverPx.y} r="3.5" fill="currentColor" />
        </g>
        <ChartTooltip
          x={hoverPx.x}
          y={hoverPx.y}
          chartWidth={width}
          chartHeight={HEIGHT}
          rows={tooltipRows}
          {startTime}
        />
      {/if}
    </svg>
  </div>

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
  }

  graph-root:hover graph-controls-slot,
  graph-root:focus-within graph-controls-slot {
    opacity: 1;
  }
</style>
