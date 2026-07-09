<script lang="ts">
  import Axis from '$lib/chart/axis.svelte'
  import { nearestPoint, type Series } from '$lib/chart/nearest'
  import { createTimeScale } from '$lib/chart/scale'
  import { ctfRelativeTicks } from '$lib/chart/ticks'
  import { IconFlagBanner } from '$lib/icons'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import type { ActivityDomain, TimelineDatum } from './analytics-data'
  import ProfileSolveTooltip from './solve-tooltip.svelte'

  interface Props {
    data: TimelineDatum[]
    categories: string[]
    activityDomain: ActivityDomain
    startTime: number
  }

  let { data, categories, activityDomain, startTime }: Props = $props()

  const ROW_H = 26
  const PAD_TOP = 8
  const PAD_BOTTOM = 28
  const PAD_LEFT = 76
  const PAD_RIGHT = 8

  let width = $state(0)
  let hover = $state<{ x: number; y: number } | null>(null)

  const height = $derived(categories.length * ROW_H + PAD_TOP + PAD_BOTTOM)
  const innerRight = $derived(Math.max(PAD_LEFT, width - PAD_RIGHT))
  const innerBottom = $derived(PAD_TOP + categories.length * ROW_H)

  const laneIndex = $derived(new Map(categories.map((label, index) => [label, index])))

  const xScale = $derived(
    createTimeScale([activityDomain.start, activityDomain.end], [PAD_LEFT, innerRight])
  )
  const xTicks = $derived(ctfRelativeTicks(activityDomain.start, activityDomain.end, 6))

  function laneY(index: number): number {
    return PAD_TOP + index * ROW_H + ROW_H / 2
  }

  const dots = $derived(
    data
      .map(datum => {
        const index = laneIndex.get(datum.categoryLabel)
        if (index === undefined) return null
        return { datum, x: xScale(datum.time), y: laneY(index) }
      })
      .filter(dot => dot !== null)
  )

  const nearestSeries = $derived<Series[]>([{ id: 'solve', points: dots }])

  const nearest = $derived.by(() => {
    if (!hover || dots.length === 0) return null
    return nearestPoint(nearestSeries, hover.x, hover.y)
  })

  const hovered = $derived(nearest ? (dots[nearest.index] ?? null) : null)

  function handleMove(event: PointerEvent) {
    const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect()
    hover = { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  function handleLeave() {
    hover = null
  }
</script>

{#if data.length > 0}
  <timeline-root style="--chart-height: {height}px">
    <div data-viewport bind:clientWidth={width}>
      <svg
        role="img"
        aria-label="Solve timeline with {data.length} solve{data.length === 1 ? '' : 's'}"
        {width}
        {height}
        onpointermove={handleMove}
        onpointerleave={handleLeave}
      >
        {#each categories as label, index (label)}
          {@const ly = laneY(index)}
          <line data-lane-grid x1={PAD_LEFT} y1={ly} x2={innerRight} y2={ly} />
          <text data-lane-label x={PAD_LEFT - 10} y={ly} dy={3} text-anchor="end">{label}</text>
        {/each}

        <Axis ticks={xTicks} scale={xScale} y={innerBottom} left={PAD_LEFT} right={innerRight} />

        {#each dots as dot (dot.datum.key)}
          <circle
            data-solve-dot
            data-category-color={dot.datum.color}
            cx={dot.x}
            cy={dot.y}
            r="4"
          />
        {/each}

        {#if nearest}
          <circle data-hover-ring cx={nearest.point.x} cy={nearest.point.y} r="6" />
        {/if}
      </svg>
    </div>

    {#if hovered && nearest}
      <ProfileSolveTooltip
        x={nearest.point.x}
        y={nearest.point.y}
        chartWidth={width}
        chartHeight={height}
        {startTime}
        time={hovered.datum.time}
        color={hovered.datum.color}
        categoryIcon={hovered.datum.categoryIcon}
        catShort={hovered.datum.categoryLabel}
        name={hovered.datum.name}
        scoreBefore={hovered.datum.scoreBefore}
        points={hovered.datum.points}
        score={hovered.datum.score}
      />
    {/if}
  </timeline-root>
{:else}
  <EmptyState icon={IconFlagBanner} title="No solves yet." />
{/if}

<style>
  timeline-root {
    position: relative;
    display: block;
    inline-size: 100%;
    block-size: var(--chart-height);
  }

  [data-viewport] {
    inline-size: 100%;
    block-size: 100%;
  }

  svg {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    outline-offset: -2px;
  }

  [data-lane-grid] {
    stroke: var(--foreground-l5);
    stroke-width: 1;
    opacity: 0.2;
  }

  [data-lane-label] {
    font-size: 0.6875rem;
    fill: var(--foreground-l3);
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
</style>
