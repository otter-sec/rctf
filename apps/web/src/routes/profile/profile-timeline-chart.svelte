<script lang="ts">
  import type { ClientConfig } from '@rctf/types'
  import ChartContainer from '$lib/components/ui/chart/chart-container.svelte'
  import { formatLocalTime, formatRelativeHours, formatRelativeHoursMinutes } from '$lib/utils/time'
  import { Axis, ChartCore, Highlight, Points, Svg, Text, Tooltip } from 'layerchart/svg'
  import type { ActivityDomain, CategoryStat, TimelineDatum } from './profile-analytics-data'
  import { buildChartConfig } from './profile-analytics-data'
  import { axisTicks, tickTextAnchor } from './profile-chart-utils'

  interface Props {
    data: TimelineDatum[]
    categories: string[]
    stats: CategoryStat[]
    activityDomain: ActivityDomain
    clientConfig: ClientConfig
  }

  let { data, categories, stats, activityDomain, clientConfig }: Props = $props()

  const height = $derived(Math.max(180, categories.length * 26 + 52))
  const chartConfig = $derived(buildChartConfig(stats))
  const colorDomain = $derived(stats.map(stat => stat.key))
  const colorRange = $derived(stats.map(stat => stat.color))
</script>

{#if data.length > 0}
  <ChartContainer config={chartConfig} class="w-full" style="height: {height}px">
    <ChartCore
      {data}
      x="time"
      y="categoryLabel"
      c="categoryKey"
      xDomain={[activityDomain.start, activityDomain.end]}
      yDomain={categories}
      cDomain={colorDomain}
      cRange={colorRange}
      padding={{ left: 76, right: 8, top: 8, bottom: 28 }}
      tooltipContext={{ mode: 'quadtree' }}
    >
      {#snippet children()}
        <Svg>
          <Axis
            placement="bottom"
            grid
            ticks={scale => axisTicks(scale)}
            format={(value: number) => formatRelativeHours(value, clientConfig.startTime)}
          >
            {#snippet tickLabel({ props, index })}
              <Text {...props} textAnchor={tickTextAnchor(index)} dy={4} />
            {/snippet}
          </Axis>
          <Axis placement="left" tickLabelProps={{ 'font-size': 10, dx: -10 }} />
          <Points r={4}>
            {#snippet children({ points })}
              {#each points as point (point.data.key)}
                <circle
                  class="lc-point"
                  style={point.data.style}
                  cx={point.x}
                  cy={point.y}
                  r={point.r}
                  fill="var(--category-background-l0)"
                  stroke="var(--category-foreground-l1)"
                  stroke-opacity={0.5}
                  stroke-width={2}
                />
              {/each}
            {/snippet}
          </Points>
          <Highlight points={{ r: 5, stroke: 'transparent', strokeWidth: 0 }} />
        </Svg>
        <Tooltip.Root anchor="top-right" motion="none" variant="none">
          {#snippet children({ data: item })}
            <div
              class="border-border/50 bg-background-l1 z-50 min-w-44 rounded-lg border-2 px-3 py-2 text-xs shadow-xl"
            >
              <div class="text-foreground-l3 mb-1.5">
                <div>{formatRelativeHoursMinutes(item.time, clientConfig.startTime)}</div>
                <div class="text-[10px]">{formatLocalTime(item.time)}</div>
              </div>
              <div class="wrap-anywhere">{item.name}</div>
              <div class="text-foreground-l3 mt-1 flex justify-between gap-4">
                <span>{item.categoryTooltipLabel}</span>
                <span class="tabular-nums">{item.points?.toLocaleString() ?? 'n/a'} pts</span>
              </div>
            </div>
          {/snippet}
        </Tooltip.Root>
      {/snippet}
    </ChartCore>
  </ChartContainer>
{:else}
  <p class="text-foreground-l5 py-8 text-center text-sm">No solves yet.</p>
{/if}
