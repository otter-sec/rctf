<script lang="ts">
  import ChartContainer from '$lib/components/ui/chart/chart-container.svelte'
  import { IconCheck } from '$lib/icons'
  import { Axis, Bar, Bars, ChartCore, Svg, Tooltip } from 'layerchart/svg'
  import type { CategoryStat, ProfileBarDatum, ProfileBarSegment } from './profile-analytics-data'
  import { buildChartConfig, maxChartValue } from './profile-analytics-data'
  import { compactNumber, integerTicks } from './profile-chart-utils'

  interface Props {
    data: ProfileBarDatum[]
    stats: CategoryStat[]
    emptyMessage: string
  }

  let { data, stats, emptyMessage }: Props = $props()
  let activeSegmentKey = $state<string | null>(null)
  const componentId = $props.id()
  const chartInstanceId = componentId.replace(/[^a-zA-Z0-9_-]/g, '-')

  const height = $derived(Math.max(180, stats.length * 28 + 42))
  const max = $derived(maxChartValue(data, item => item.max))
  const chartConfig = $derived(buildChartConfig(data))
  const labels = $derived(stats.map(stat => stat.label))
  const colorDomain = $derived(stats.map(stat => stat.key))
  const colorRange = $derived(stats.map(stat => stat.color))

  function segmentClipId(key: string, index: number): string {
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '-')
    return `profile-category-segments-${chartInstanceId}-${index}-${safeKey}`
  }

  function fullClearClipId(key: string, index: number): string {
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '-')
    return `profile-category-clear-clip-${chartInstanceId}-${index}-${safeKey}`
  }

  function fullClearGradientId(key: string, index: number): string {
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '-')
    return `profile-category-clear-gradient-${chartInstanceId}-${index}-${safeKey}`
  }

  function segmentKey(item: ProfileBarDatum, segment: ProfileBarSegment): string {
    return `${item.key}:${segment.key}`
  }

  function isFullClear(item: ProfileBarDatum): boolean {
    return item.value >= item.max
  }

  function segmentTooltipData(
    item: ProfileBarDatum,
    segment: ProfileBarSegment
  ): ProfileBarDatum & { segment: ProfileBarSegment } {
    return { ...item, segment }
  }
</script>

{#if data.length > 0}
  <ChartContainer config={chartConfig} class="w-full" style="height: {height}px">
    <ChartCore
      {data}
      x="value"
      y="label"
      c="key"
      xDomain={[0, max]}
      yDomain={labels}
      cDomain={colorDomain}
      cRange={colorRange}
      valueAxis="x"
      padding={{ left: 76, right: 8, top: 4, bottom: 24 }}
      tooltipContext={{ mode: 'manual' }}
    >
      {#snippet children({ context })}
        <Svg>
          <Axis
            placement="bottom"
            grid
            ticks={scale => integerTicks(scale)}
            format={(value: number) => compactNumber(value)}
          />
          <Axis placement="left" tickLabelProps={{ 'font-size': 10, dx: -10 }} />
          <Bars
            {data}
            x="max"
            y="label"
            fill="var(--background-l4)"
            insets={{ top: 2, bottom: 2 }}
            radius={4}
            rounded="all"
          />
          {#each data as item, index (item.key)}
            {@const x0 = context.xScale(0)}
            {@const y = context.yScale(item.label) + 2}
            {@const barHeight = Math.max((context.yScale.bandwidth?.() ?? 0) - 4, 0)}
            {#if item.segments && item.segments.length > 0}
              {@const clipId = segmentClipId(item.key, index)}
              <defs>
                <clipPath id={clipId}>
                  <rect
                    x={x0}
                    {y}
                    width={Math.max(0, context.xScale(item.value) - x0)}
                    height={barHeight}
                    rx={4}
                  />
                </clipPath>
              </defs>
              <g style={item.style} clip-path={`url(#${clipId})`}>
                {#each item.segments as segment (segment.key)}
                  {@const x = context.xScale(segment.start)}
                  {@const key = segmentKey(item, segment)}
                  {@const active = activeSegmentKey === key}
                  <rect
                    {x}
                    {y}
                    width={Math.max(0, context.xScale(segment.end) - x)}
                    height={barHeight}
                    fill={active
                      ? 'var(--category-foreground-l1)'
                      : 'var(--category-background-l0)'}
                    fill-opacity={active ? 0.25 : 1}
                    role="img"
                    aria-label={segment.label}
                    onpointerenter={event => {
                      activeSegmentKey = key
                      context.tooltip.show(event, segmentTooltipData(item, segment))
                    }}
                    onpointermove={event => {
                      activeSegmentKey = key
                      context.tooltip.show(event, segmentTooltipData(item, segment))
                    }}
                    onpointerleave={() => {
                      activeSegmentKey = null
                      context.tooltip.hide()
                    }}
                  />
                {/each}
                {#each item.segments as segment (segment.key)}
                  {#if segment.end < item.value}
                    {@const x = context.xScale(segment.end)}
                    <line
                      class="pointer-events-none"
                      x1={x}
                      x2={x}
                      y1={y}
                      y2={y + barHeight}
                      stroke="var(--category-foreground-l1)"
                      stroke-opacity={0.45}
                      stroke-width={1}
                    />
                  {/if}
                {/each}
              </g>
              <Bar
                data={item}
                style={item.style}
                class="pointer-events-none"
                fill="transparent"
                stroke="var(--category-foreground-l1)"
                strokeOpacity={0.75}
                strokeWidth={1.5}
                insets={{ top: 2, bottom: 2 }}
                radius={4}
                rounded="all"
              />
            {:else}
              <Bar
                data={item}
                style={item.style}
                fill="var(--category-background-l0)"
                stroke="var(--category-foreground-l1)"
                strokeOpacity={0.75}
                strokeWidth={1.5}
                insets={{ top: 2, bottom: 2 }}
                tooltip
                radius={4}
                rounded="all"
              />
            {/if}
            {#if isFullClear(item)}
              {@const x1 = context.xScale(item.value)}
              {@const barWidth = Math.max(0, x1 - x0)}
              {@const clearClipId = fullClearClipId(item.key, index)}
              {@const clearGradientId = fullClearGradientId(item.key, index)}
              {@const clearGradientWidth = Math.min(140, barWidth)}
              <defs>
                <linearGradient id={clearGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop
                    offset="0%"
                    style="stop-color: var(--foreground-success); stop-opacity: 0.22"
                  />
                  <stop
                    offset="100%"
                    style="stop-color: var(--foreground-success); stop-opacity: 0"
                  />
                </linearGradient>
                <clipPath id={clearClipId}>
                  <rect
                    x={x0 + 1}
                    y={y + 1}
                    width={Math.max(0, barWidth - 2)}
                    height={Math.max(0, barHeight - 2)}
                    rx={3}
                  />
                </clipPath>
              </defs>
              <g class="pointer-events-none" clip-path={`url(#${clearClipId})`}>
                <rect
                  x={x0}
                  {y}
                  width={clearGradientWidth}
                  height={barHeight}
                  fill={`url(#${clearGradientId})`}
                />
              </g>
              <g
                class="text-foreground-success pointer-events-none"
                transform={`translate(${x0 + 7}, ${y + barHeight / 2 - 6})`}
              >
                <IconCheck class="size-3.5" />
              </g>
            {/if}
          {/each}
        </Svg>
        <Tooltip.Root anchor="top-right" motion="none" variant="none">
          {#snippet children({ data: item })}
            {@const Icon = item.icon}
            <div
              class="border-background-l5 bg-background-l3 z-50 rounded-lg border-2 px-3 py-2 text-xs shadow-xl"
            >
              {#if item.segment}
                <div class="flex items-center gap-2" style={item.style}>
                  {#if Icon}
                    <Icon class="text-category-foreground-l1 size-4 shrink-0" />
                  {/if}
                  <div class="flex min-w-0 items-baseline gap-1 font-medium">
                    <span class="text-category-foreground-l1 shrink-0">{item.label} /</span>
                    <span class="text-category-foreground-l0 truncate">
                      {item.segment.label}
                    </span>
                  </div>
                </div>
                <div class="text-foreground-l3 mt-1 tabular-nums">
                  {item.segment.value.toLocaleString()} pts
                </div>
              {:else if Icon}
                <div class="flex items-center gap-2" style={item.style}>
                  <Icon class="text-category-foreground-l1 size-4 shrink-0" />
                  <span class="text-category-foreground-l1 font-medium">
                    {item.tooltipLabel ?? item.label}
                  </span>
                </div>
              {:else}
                <div>{item.tooltipLabel ?? item.label}</div>
              {/if}
              {#if !item.segment}
                <div class="text-foreground-l3 mt-1 tabular-nums">{item.detail}</div>
              {/if}
            </div>
          {/snippet}
        </Tooltip.Root>
      {/snippet}
    </ChartCore>
  </ChartContainer>
{:else}
  <p class="text-foreground-l5 py-8 text-center text-sm">{emptyMessage}</p>
{/if}
