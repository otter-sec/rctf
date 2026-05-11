<script lang="ts">
  import ChartContainer from '$lib/components/ui/chart/chart-container.svelte'
  import type { ChartConfig } from '$lib/components/ui/chart/chart-utils'
  import { formatRelativeHoursMinutes } from '$lib/utils/time'
  import { Axis, Bars, ChartCore, Svg, Tooltip } from 'layerchart/svg'
  import type { CadenceDatum } from './profile-analytics-data'
  import { maxChartValue } from './profile-analytics-data'
  import { integerTicks } from './profile-chart-utils'

  interface Props {
    data: CadenceDatum[]
    ctfStart: number
  }

  let { data, ctfStart }: Props = $props()

  const max = $derived(maxChartValue(data, item => item.count))
  const chartConfig = {
    solves: { label: 'solves', color: 'var(--foreground-l4)' },
  } satisfies ChartConfig
</script>

<ChartContainer config={chartConfig} class="h-44 w-full">
  <ChartCore
    {data}
    x="label"
    y="count"
    yDomain={[0, max]}
    yNice
    padding={{ left: 38, right: 8, top: 8, bottom: 28 }}
    tooltipContext={{ mode: 'band' }}
  >
    {#snippet children()}
      <Svg>
        <Axis
          placement="left"
          grid
          ticks={scale => integerTicks(scale, 3)}
          tickLabelProps={{ 'font-size': 10, dx: -10 }}
        />
        <Axis placement="bottom" tickLabelProps={{ 'font-size': 10 }} />
        <Bars
          fill="var(--background-l3)"
          stroke="var(--foreground-l5)"
          strokeOpacity={1}
          strokeWidth={1.5}
          insets={{ left: 2, right: 2 }}
          tooltip
          radius={4}
          rounded="all"
        />
      </Svg>
      <Tooltip.Root anchor="top-right" motion="none" variant="none">
        {#snippet children({ data: item })}
          <div
            class="border-background-l5 bg-background-l3 z-50 rounded-lg border-2 px-3 py-2 text-xs shadow-xl"
          >
            <div class="tabular-nums">{item.count.toLocaleString()} solves</div>
            <div class="text-foreground-l3 mt-1">
              {formatRelativeHoursMinutes(item.start, ctfStart)}
              -
              {formatRelativeHoursMinutes(item.end, ctfStart)}
            </div>
          </div>
        {/snippet}
      </Tooltip.Root>
    {/snippet}
  </ChartCore>
</ChartContainer>
