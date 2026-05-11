<script lang="ts">
  import ChartContainer from '$lib/components/ui/chart/chart-container.svelte'
  import { Axis, Bar, Bars, ChartCore, Svg, Tooltip } from 'layerchart/svg'
  import type { CategoryStat, ProfileBarDatum } from './profile-analytics-data'
  import { buildChartConfig, maxChartValue } from './profile-analytics-data'
  import { compactNumber, integerTicks } from './profile-chart-utils'

  interface Props {
    data: ProfileBarDatum[]
    stats: CategoryStat[]
    emptyMessage: string
  }

  let { data, stats, emptyMessage }: Props = $props()

  const height = $derived(Math.max(180, stats.length * 28 + 42))
  const max = $derived(maxChartValue(data, item => item.max))
  const chartConfig = $derived(buildChartConfig(data))
  const labels = $derived(stats.map(stat => stat.label))
  const colorDomain = $derived(stats.map(stat => stat.key))
  const colorRange = $derived(stats.map(stat => stat.color))
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
      tooltipContext={{ mode: 'band' }}
    >
      {#snippet children()}
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
          {#each data as item (item.key)}
            <Bar
              data={item}
              style={item.style}
              fill="var(--category-background-l0)"
              stroke="var(--category-foreground-l1)"
              strokeOpacity={0.5}
              strokeWidth={2}
              insets={{ top: 2, bottom: 2 }}
              tooltip
              radius={4}
              rounded="all"
            />
          {/each}
        </Svg>
        <Tooltip.Root anchor="top-right" motion="none" variant="none">
          {#snippet children({ data: item })}
            <div
              class="border-border/50 bg-background-l1 z-50 rounded-lg border-2 px-3 py-2 text-xs shadow-xl"
            >
              <div>{item.tooltipLabel ?? item.label}</div>
              <div class="text-foreground-l3 mt-1 tabular-nums">{item.detail}</div>
            </div>
          {/snippet}
        </Tooltip.Root>
      {/snippet}
    </ChartCore>
  </ChartContainer>
{:else}
  <p class="text-foreground-l5 py-8 text-center text-sm">{emptyMessage}</p>
{/if}
