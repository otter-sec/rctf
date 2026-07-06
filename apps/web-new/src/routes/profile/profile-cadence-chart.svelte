<!--
  Solve cadence histogram. Vertical bars over the adaptive activity buckets from
  buildCadenceData; one delegated pointer handler on the SVG resolves the hovered
  bar's data-index into an HTML tooltip showing the solve count and the bucket's
  relative time range. Hand-rolled SVG on the shared chart core.
-->
<script lang="ts">
  import { createLinearScale } from '$lib/chart/scale'
  import { niceLinearTicks } from '$lib/chart/y-ticks'
  import { formatRelativeHoursMinutes } from '$lib/utils/time'
  import { maxChartValue, type CadenceDatum } from './profile-analytics-data'
  import { compactNumber } from './profile-chart-utils'

  interface Props {
    data: CadenceDatum[]
    ctfStart: number
  }

  let { data, ctfStart }: Props = $props()

  const PAD_TOP = 8
  const PAD_BOTTOM = 28
  const PAD_LEFT = 38
  const PAD_RIGHT = 8
  const BAR_INSET = 2

  let width = $state(0)
  let height = $state(0)
  let activeIndex = $state<number | null>(null)
  let tip = $state<{ x: number; y: number } | null>(null)

  const innerRight = $derived(Math.max(PAD_LEFT, width - PAD_RIGHT))
  const innerBottom = $derived(Math.max(PAD_TOP, height - PAD_BOTTOM))
  const bandWidth = $derived(data.length > 0 ? (innerRight - PAD_LEFT) / data.length : 0)

  const yTicks = $derived(
    niceLinearTicks(
      maxChartValue(data, item => item.count),
      3
    )
  )
  const yScale = $derived(createLinearScale([0, yTicks.max], [innerBottom, PAD_TOP]))

  const active = $derived(activeIndex === null ? null : (data[activeIndex] ?? null))

  function barX(index: number): number {
    return PAD_LEFT + index * bandWidth + BAR_INSET
  }

  function handleMove(event: PointerEvent) {
    const svg = event.currentTarget as SVGSVGElement
    const target = event.target as Element | null
    const hit = target?.closest<SVGRectElement>('[data-bar-hit]') ?? null
    if (!hit) {
      activeIndex = null
      tip = null
      return
    }
    activeIndex = Number(hit.dataset.index)
    const rect = svg.getBoundingClientRect()
    tip = { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  function handleLeave() {
    activeIndex = null
    tip = null
  }
</script>

<cadence-root>
  <div data-viewport bind:clientWidth={width} bind:clientHeight={height}>
    <svg
      role="img"
      aria-label="Solve cadence histogram"
      {width}
      {height}
      onpointermove={handleMove}
      onpointerleave={handleLeave}
    >
      {#each yTicks.values as value (value)}
        {@const gy = yScale(value)}
        <line data-y-grid x1={PAD_LEFT} y1={gy} x2={innerRight} y2={gy} />
        <text data-y-label x={PAD_LEFT - 6} y={gy} dy={3} text-anchor="end">
          {compactNumber(value)}
        </text>
      {/each}

      {#each data as item, index (item.key)}
        {@const x = barX(index)}
        {@const w = Math.max(0, bandWidth - BAR_INSET * 2)}
        {@const y = yScale(item.count)}
        {@const barHeight = Math.max(0, innerBottom - y)}
        {@const cx = PAD_LEFT + index * bandWidth + bandWidth / 2}
        {#if barHeight > 0}
          <rect
            data-bar
            data-active={activeIndex === index || undefined}
            {x}
            {y}
            width={w}
            height={barHeight}
            rx="4"
          />
        {/if}
        <text data-x-label x={cx} y={innerBottom} dy={16} text-anchor="middle">{item.label}</text>
        <rect
          data-bar-hit
          data-index={index}
          x={PAD_LEFT + index * bandWidth}
          y={PAD_TOP}
          width={bandWidth}
          height={innerBottom - PAD_TOP}
        />
      {/each}

      <line data-axis-rule x1={PAD_LEFT} y1={innerBottom} x2={innerRight} y2={innerBottom} />
    </svg>
  </div>

  {#if active && tip}
    <chart-tip
      data-flip={tip.x > width / 2 || undefined}
      style="--tip-x: {tip.x}px; --tip-y: {tip.y}px"
    >
      <span data-count>{active.count.toLocaleString()} solves</span>
      <span data-range>
        {formatRelativeHoursMinutes(active.start, ctfStart)}
        –
        {formatRelativeHoursMinutes(active.end, ctfStart)}
      </span>
    </chart-tip>
  {/if}
</cadence-root>

<style>
  cadence-root {
    position: relative;
    display: block;
    inline-size: 100%;
    block-size: 11rem;
  }

  [data-viewport] {
    inline-size: 100%;
    block-size: 100%;
  }

  svg {
    display: block;
    inline-size: 100%;
    block-size: 100%;
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

  [data-x-label] {
    font-size: 0.6875rem;
    fill: var(--foreground-l3);
  }

  [data-axis-rule] {
    stroke: var(--foreground-l5);
    stroke-width: 1;
  }

  [data-bar] {
    fill: var(--background-l3);
    stroke: var(--foreground-l5);
    stroke-width: 1.5;
    transition: fill 120ms ease;

    &[data-active] {
      fill: var(--background-l4);
    }
  }

  [data-bar-hit] {
    fill: transparent;
  }

  chart-tip {
    position: absolute;
    inset-block-start: var(--tip-y);
    inset-inline-start: var(--tip-x);
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    padding: var(--space-2xs) var(--space-xs);
    font-size: var(--step--1);
    background: var(--background-l4);
    border: 1px solid var(--background-l5);
    border-radius: var(--radius-md);
    pointer-events: none;
    transform: translate(0.75rem, -50%);

    &[data-flip] {
      transform: translate(calc(-100% - 0.75rem), -50%);
    }
  }

  [data-count] {
    font-variant-numeric: tabular-nums;
    color: var(--foreground-l1);
  }

  [data-range] {
    color: var(--foreground-l3);
  }
</style>
