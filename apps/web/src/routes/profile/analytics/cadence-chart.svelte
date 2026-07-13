<script lang="ts">
  import ChartTip from '$lib/chart/chart-tip.svelte'
  import { createHoverTip } from '$lib/chart/hover-tip.svelte'
  import { createLinearScale } from '$lib/chart/scale'
  import { niceLinearTicks } from '$lib/chart/y-ticks'
  import { IconFlagBanner } from '$lib/icons'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import { formatRelativeHoursMinutes } from '$lib/utils/time'
  import { maxChartValue, type CadenceDatum } from './analytics-data'
  import { compactNumber } from './chart-utils'

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
  const hover = createHoverTip('data-bar-hit', 'index')

  const innerRight = $derived(Math.max(PAD_LEFT, width - PAD_RIGHT))
  const innerBottom = $derived(Math.max(PAD_TOP, height - PAD_BOTTOM))
  const bandWidth = $derived(
    data.length > 0 ? (innerRight - PAD_LEFT) / data.length : 0
  )

  const yTicks = $derived(
    niceLinearTicks(
      maxChartValue(data, item => item.count),
      3
    )
  )
  const yScale = $derived(
    createLinearScale([0, yTicks.max], [innerBottom, PAD_TOP])
  )

  const activeIndex = $derived(
    hover.activeKey === null ? null : Number(hover.activeKey)
  )
  const active = $derived(
    activeIndex === null ? null : (data[activeIndex] ?? null)
  )

  function barX(index: number): number {
    return PAD_LEFT + index * bandWidth + BAR_INSET
  }

  const hasSolves = $derived(data.some(item => item.count > 0))
</script>

{#if hasSolves}
  <cadence-root>
    <div data-viewport bind:clientWidth={width} bind:clientHeight={height}>
      <svg
        role="img"
        aria-label="Solve cadence histogram"
        {width}
        {height}
        onpointermove={hover.handleMove}
        onpointerleave={hover.handleLeave}
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
          <text data-x-label x={cx} y={innerBottom} dy={16} text-anchor="middle"
            >{item.label}</text
          >
          <rect
            data-bar-hit
            data-index={index}
            x={PAD_LEFT + index * bandWidth}
            y={PAD_TOP}
            width={bandWidth}
            height={innerBottom - PAD_TOP}
          />
        {/each}

        <line
          data-axis-rule
          x1={PAD_LEFT}
          y1={innerBottom}
          x2={innerRight}
          y2={innerBottom}
        />
      </svg>
    </div>

    {#if active && hover.tip}
      <ChartTip
        x={hover.tip.x}
        y={hover.tip.y}
        chartWidth={width}
        chartHeight={height}
      >
        <span data-count>{active.count.toLocaleString()} solves</span>
        <span data-range>
          {formatRelativeHoursMinutes(active.start, ctfStart)}
          –
          {formatRelativeHoursMinutes(active.end, ctfStart)}
        </span>
      </ChartTip>
    {/if}
  </cadence-root>
{:else}
  <EmptyState icon={IconFlagBanner} title="No solves yet." />
{/if}

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

  [data-count] {
    font-variant-numeric: tabular-nums;
    color: var(--foreground-l1);
  }

  [data-range] {
    color: var(--foreground-l3);
  }
</style>
