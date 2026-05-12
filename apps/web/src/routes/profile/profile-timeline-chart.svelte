<script lang="ts">
  import type { ClientConfig } from '@rctf/types'
  import ChartContainer from '$lib/components/ui/chart/chart-container.svelte'
  import { formatRelativeHours } from '$lib/utils/time'
  import { Axis, ChartCore, Highlight, Points, Svg, Text, Tooltip } from 'layerchart/svg'
  import type { ActivityDomain, TimelineDatum } from './profile-analytics-data'
  import { axisTicks, tickTextAnchor } from './profile-chart-utils'
  import ProfileSolveTooltip from './profile-solve-tooltip.svelte'

  interface Props {
    data: TimelineDatum[]
    categories: string[]
    activityDomain: ActivityDomain
    clientConfig: ClientConfig
  }

  let { data, categories, activityDomain, clientConfig }: Props = $props()

  const rowHeightPx = 26
  const minChartHeightPx = 180
  const axisOverheadPx = 52

  const height = $derived(
    Math.max(minChartHeightPx, categories.length * rowHeightPx + axisOverheadPx)
  )
  const colorDomain = $derived(Array.from(new Set(data.map(point => point.color))))
</script>

{#if data.length > 0}
  <ChartContainer class="w-full" style="height: {height}px">
    <ChartCore
      {data}
      x="time"
      y="categoryLabel"
      c="color"
      xDomain={[activityDomain.start, activityDomain.end]}
      yDomain={categories}
      cDomain={colorDomain}
      cRange={colorDomain}
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
            <ProfileSolveTooltip
              time={item.time}
              ctfStart={clientConfig.startTime}
              style={item.style}
              categoryIcon={item.categoryIcon}
              categoryKey={item.categoryKey}
              challengeName={item.name}
              scoreBefore={item.scoreBefore}
              points={item.points}
              score={item.score}
            />
          {/snippet}
        </Tooltip.Root>
      {/snippet}
    </ChartCore>
  </ChartContainer>
{:else}
  <p class="text-foreground-l5 py-8 text-center text-sm">No solves yet.</p>
{/if}
