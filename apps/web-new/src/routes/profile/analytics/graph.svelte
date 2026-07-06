<script lang="ts">
  import Axis from '$lib/chart/axis.svelte'
  import ChartTip from '$lib/chart/chart-tip.svelte'
  import Line from '$lib/chart/line.svelte'
  import { nearestPoint, type Series } from '$lib/chart/nearest'
  import { monotoneCubicPath } from '$lib/chart/path'
  import { createLinearScale, createTimeScale } from '$lib/chart/scale'
  import { ctfRelativeTicks } from '$lib/chart/ticks'
  import { niceLinearTicks } from '$lib/chart/y-ticks'
  import IconChartAreaLineFilled from '$lib/icons/icon-chart-area-line-filled.svelte'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import type { ProfileDynamicScore, ProfileSolve } from './analytics-data'
  import { compactNumber } from './chart-utils'
  import { buildProfileGraphData, scoreAt, type GraphSampleInput } from './graph-data'
  import ProfileSolveTooltip from './solve-tooltip.svelte'

  interface Props {
    graphData: GraphSampleInput
    solves?: ProfileSolve[]
    dynamicScores?: ProfileDynamicScore[]
    startTime: number
    endTime: number
    splitDynamicScore?: boolean
  }

  let {
    graphData,
    solves = [],
    dynamicScores = [],
    startTime,
    endTime,
    splitDynamicScore = false,
  }: Props = $props()

  const PAD_TOP = 8
  const PAD_RIGHT = 8
  const PAD_BOTTOM = 24
  const PAD_LEFT = 44

  let width = $state(0)
  let height = $state(0)
  let hover = $state<{ x: number; y: number } | null>(null)

  const graph = $derived(
    buildProfileGraphData({
      graphData,
      solves,
      dynamicScores,
      startTime,
      endTime,
      splitDynamicScore,
    })
  )

  const innerLeft = PAD_LEFT
  const innerRight = $derived(Math.max(PAD_LEFT, width - PAD_RIGHT))
  const innerBottom = $derived(Math.max(PAD_TOP, height - PAD_BOTTOM))

  const yTicks = $derived(niceLinearTicks(graph.yMax, 4))
  const xScale = $derived(
    createTimeScale(graph.xDomain ?? [startTime, endTime], [innerLeft, innerRight])
  )
  const yScale = $derived(createLinearScale([0, yTicks.max], [innerBottom, PAD_TOP]))
  const xTicks = $derived(
    graph.xDomain ? ctfRelativeTicks(graph.xDomain[0], graph.xDomain[1], 7) : []
  )

  const totalPx = $derived(graph.totalLine.map(p => ({ x: xScale(p.time), y: yScale(p.score) })))
  const staticPx = $derived(graph.staticLine.map(p => ({ x: xScale(p.time), y: yScale(p.score) })))
  const dynamicPath = $derived(
    monotoneCubicPath(graph.dynamicLine.map(p => ({ x: xScale(p.time), y: yScale(p.score) })))
  )
  const dotPx = $derived(graph.solveDots.map(d => ({ x: xScale(d.time), y: yScale(d.score) })))

  const nearest = $derived.by(() => {
    if (!hover) return null
    const series: Series[] = []
    if (totalPx.length > 0) series.push({ id: 'sample', points: totalPx })
    if (dotPx.length > 0) series.push({ id: 'solve', points: dotPx })
    if (series.length === 0) return null
    return nearestPoint(
      series,
      hover.x,
      hover.y,
      px => px,
      px => px
    )
  })

  const hoveredSolve = $derived(
    nearest?.seriesId === 'solve' ? (graph.solveDots[nearest.index] ?? null) : null
  )
  const hoveredSample = $derived(
    nearest?.seriesId === 'sample' ? (graph.totalLine[nearest.index] ?? null) : null
  )

  interface SampleRow {
    label: string
    value: number
  }

  const sampleRows = $derived.by<SampleRow[]>(() => {
    if (!hoveredSample) return []
    if (splitDynamicScore && graph.hasDynamicLine) {
      const dynamicScore = scoreAt(hoveredSample.time, graph.dynamicLine)
      const staticScore = Math.max(hoveredSample.score - dynamicScore, 0)
      return [
        { label: 'Dynamic', value: dynamicScore },
        { label: 'Static', value: staticScore },
        { label: 'Total', value: hoveredSample.score },
      ]
    }
    return [{ label: 'Total score', value: hoveredSample.score }]
  })

  const anchorX = $derived(nearest ? nearest.point.x : 0)
  const anchorY = $derived(nearest ? nearest.point.y : 0)

  const hasContent = $derived(graph.xDomain !== null)

  const ariaLabel = $derived(
    `Score over time with ${graph.solveDots.length} solve${graph.solveDots.length === 1 ? '' : 's'}`
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
  {#if hasContent}
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
        {#each yTicks.values as value (value)}
          {@const gy = yScale(value)}
          <line data-y-grid x1={innerLeft} y1={gy} x2={innerRight} y2={gy} />
          <text data-y-label x={innerLeft - 6} y={gy} dy={3} text-anchor="end">
            {compactNumber(value)}
          </text>
        {/each}

        <Axis ticks={xTicks} scale={xScale} y={innerBottom} left={innerLeft} right={innerRight} />

        {#if graph.hasDynamicLine && dynamicPath}
          <path data-dynamic-line d={dynamicPath} />
        {/if}

        {#if graph.hasStaticLine}
          <g data-line-role="static">
            <Line points={staticPx} width={1.75} />
          </g>
        {/if}

        {#if graph.hasTotalLine}
          <g data-line-role="total">
            <Line points={totalPx} width={2.25} />
          </g>
        {/if}

        {#each graph.solveDots as dot, index (dot.key)}
          {@const px = dotPx[index]}
          {#if px}
            <circle data-solve-dot data-category-color={dot.color} cx={px.x} cy={px.y} r="4" />
          {/if}
        {/each}

        {#if nearest}
          <circle data-hover-ring cx={anchorX} cy={anchorY} r="6" />
        {/if}
      </svg>
    </div>

    {#if hoveredSolve}
      <ProfileSolveTooltip
        x={anchorX}
        y={anchorY}
        chartWidth={width}
        chartHeight={height}
        {startTime}
        time={hoveredSolve.time}
        color={hoveredSolve.color}
        categoryIcon={hoveredSolve.categoryIcon}
        catShort={hoveredSolve.catShort}
        name={hoveredSolve.name}
        scoreBefore={hoveredSolve.scoreBefore}
        points={hoveredSolve.points}
        score={hoveredSolve.score}
      />
    {:else if hoveredSample}
      <ChartTip
        x={anchorX}
        y={anchorY}
        chartWidth={width}
        chartHeight={height}
        time={hoveredSample.time}
        {startTime}
      >
        <sample-rows>
          {#each sampleRows as row (row.label)}
            <span data-label>{row.label}</span>
            <span data-value>{row.value.toLocaleString()} pts</span>
          {/each}
        </sample-rows>
      </ChartTip>
    {/if}
  {:else}
    <EmptyState icon={IconChartAreaLineFilled} title="No score graph data." />
  {/if}
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

  [data-y-grid] {
    stroke: var(--foreground-l5);
    stroke-width: 1;
    opacity: 0.25;
  }

  [data-y-label] {
    font-size: 0.6875rem;
    font-variant-numeric: tabular-nums;
    fill: var(--foreground-l3);
  }

  [data-line-role='total'] {
    color: var(--foreground-l2);
  }

  [data-line-role='static'] {
    color: var(--foreground-l3);
  }

  [data-dynamic-line] {
    fill: none;
    stroke: var(--foreground-l5);
    stroke-width: 1.75;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 4 4;
  }

  [data-solve-dot] {
    fill: var(--category-background-l0);
    stroke: var(--category-foreground-l1);
    stroke-opacity: 0.6;
    stroke-width: 2;
  }

  [data-hover-ring] {
    fill: none;
    stroke: var(--foreground-l3);
    stroke-width: 1.5;
    pointer-events: none;
  }

  sample-rows {
    display: grid;
    grid-template-columns: auto auto;
    gap: 0.125rem var(--space-s);
    min-inline-size: 9rem;
    font-variant-numeric: tabular-nums;

    [data-label] {
      align-self: center;
      font-size: 0.625rem;
      color: var(--foreground-l4);
    }

    [data-value] {
      text-align: end;
      color: var(--foreground-l1);
    }
  }
</style>
