<script lang="ts">
  import ChartContainer from '$lib/components/ui/chart/chart-container.svelte'
  import { Axis, Bars, ChartCore, Svg, Tooltip } from 'layerchart/svg'
  import type { DifficultyDatum } from './profile-analytics-data'
  import { maxChartValue } from './profile-analytics-data'
  import { compactNumber, integerTicks } from './profile-chart-utils'

  interface Props {
    data: DifficultyDatum[]
  }

  let { data }: Props = $props()

  const max = $derived(maxChartValue(data, item => item.max))
  const labels = $derived(data.map(item => item.label))
</script>

<ChartContainer class="h-44 w-full">
  <ChartCore
    {data}
    x="value"
    y="label"
    xDomain={[0, max]}
    yDomain={labels}
    valueAxis="x"
    padding={{ left: 54, right: 8, top: 4, bottom: 24 }}
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
        <Bars
          fill="var(--background-l3)"
          stroke="var(--foreground-l5)"
          strokeWidth={1.5}
          insets={{ top: 2, bottom: 2 }}
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
            <div>{item.label}</div>
            <div class="text-foreground-l3 mt-1 tabular-nums">
              {item.value.toLocaleString()}/{item.max.toLocaleString()} challenges
            </div>
            <div class="text-foreground-l3 tabular-nums">{item.detail}</div>
          </div>
        {/snippet}
      </Tooltip.Root>
    {/snippet}
  </ChartCore>
</ChartContainer>
