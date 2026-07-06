<!--
  Difficulty profile. Horizontal bars over the fixed solve-count bins from
  buildDifficultyData: a grey track = challenges available in the bin, a filled
  bar = the user's solves in it. One delegated pointer handler resolves the
  hovered row into an HTML tooltip (`x/y challenges` + points earned).
-->
<script lang="ts">
  import ChartTip from '$lib/chart/chart-tip.svelte'
  import { createHoverTip } from '$lib/chart/hover-tip.svelte'
  import { createLinearScale } from '$lib/chart/scale'
  import { niceLinearTicks } from '$lib/chart/y-ticks'
  import { maxChartValue, type DifficultyDatum } from './analytics-data'
  import { compactNumber } from './chart-utils'

  interface Props {
    data: DifficultyDatum[]
  }

  let { data }: Props = $props()

  const PAD_TOP = 6
  const PAD_BOTTOM = 24
  const PAD_LEFT = 54
  const PAD_RIGHT = 8
  const ROW_INSET = 3

  let width = $state(0)
  let height = $state(0)
  const hover = createHoverTip('data-row-hit', 'index')

  const innerRight = $derived(Math.max(PAD_LEFT, width - PAD_RIGHT))
  const innerBottom = $derived(Math.max(PAD_TOP, height - PAD_BOTTOM))
  const rowHeight = $derived(data.length > 0 ? (innerBottom - PAD_TOP) / data.length : 0)

  const chartMax = $derived(maxChartValue(data, item => item.max))
  const xScale = $derived(createLinearScale([0, chartMax], [PAD_LEFT, innerRight]))
  const xTicks = $derived(niceLinearTicks(chartMax, 4))

  const activeIndex = $derived(hover.activeKey === null ? null : Number(hover.activeKey))
  const active = $derived(activeIndex === null ? null : (data[activeIndex] ?? null))

  function rowY(index: number): number {
    return PAD_TOP + index * rowHeight + ROW_INSET
  }
</script>

<difficulty-root>
  <div data-viewport bind:clientWidth={width} bind:clientHeight={height}>
    <svg
      role="img"
      aria-label="Difficulty profile"
      {width}
      {height}
      onpointermove={hover.handleMove}
      onpointerleave={hover.handleLeave}
    >
      {#each xTicks.values as value (value)}
        {@const gx = xScale(value)}
        <line data-x-grid x1={gx} y1={PAD_TOP} x2={gx} y2={innerBottom} />
        <text data-x-label x={gx} y={innerBottom} dy={16} text-anchor="middle">
          {compactNumber(value)}
        </text>
      {/each}

      {#each data as item, index (item.key)}
        {@const y = rowY(index)}
        {@const barHeight = Math.max(0, rowHeight - ROW_INSET * 2)}
        {@const trackWidth = Math.max(0, xScale(item.max) - PAD_LEFT)}
        {@const fillWidth = Math.max(0, xScale(item.value) - PAD_LEFT)}
        <rect data-track x={PAD_LEFT} {y} width={trackWidth} height={barHeight} rx="4" />
        {#if fillWidth > 0}
          <rect
            data-fill
            data-active={activeIndex === index || undefined}
            x={PAD_LEFT}
            {y}
            width={fillWidth}
            height={barHeight}
            rx="4"
          />
        {/if}
        <text data-row-label x={PAD_LEFT - 10} y={y + barHeight / 2} dy={3} text-anchor="end">
          {item.label}
        </text>
        <rect
          data-row-hit
          data-index={index}
          x={PAD_LEFT}
          y={PAD_TOP + index * rowHeight}
          width={innerRight - PAD_LEFT}
          height={rowHeight}
        />
      {/each}

      <line data-axis-rule x1={PAD_LEFT} y1={innerBottom} x2={innerRight} y2={innerBottom} />
    </svg>
  </div>

  {#if active && hover.tip}
    <ChartTip x={hover.tip.x} y={hover.tip.y} chartWidth={width} chartHeight={height}>
      <span data-heading>{active.label}</span>
      <span data-detail
        >{active.value.toLocaleString()}/{active.max.toLocaleString()} challenges</span
      >
      <span data-detail>{active.detail}</span>
    </ChartTip>
  {/if}
</difficulty-root>

<style>
  difficulty-root {
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

  [data-x-grid] {
    stroke: var(--foreground-l5);
    stroke-width: 1;
    opacity: 0.25;
  }

  [data-x-label] {
    font-size: 0.6875rem;
    font-variant-numeric: tabular-nums;
    fill: var(--foreground-l3);
  }

  [data-row-label] {
    font-size: 0.6875rem;
    fill: var(--foreground-l3);
  }

  [data-axis-rule] {
    stroke: var(--foreground-l5);
    stroke-width: 1;
  }

  [data-track] {
    fill: var(--background-l4);
  }

  [data-fill] {
    fill: var(--background-l3);
    stroke: var(--foreground-l5);
    stroke-width: 1.5;
    transition: fill 120ms ease;

    &[data-active] {
      fill: var(--background-l5);
    }
  }

  [data-row-hit] {
    fill: transparent;
  }

  [data-heading] {
    color: var(--foreground-l1);
  }

  [data-detail] {
    font-variant-numeric: tabular-nums;
    color: var(--foreground-l3);
  }
</style>
