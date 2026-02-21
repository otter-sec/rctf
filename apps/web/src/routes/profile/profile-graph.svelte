<script lang="ts">
  import type { LeaderboardGraphEntry } from '@rctf/types'
  import { Chart, type ChartConfig } from '$lib/components'
  import { useClientConfig } from '$lib/query'
  import { formatLocalTime, formatRelativeHours, formatRelativeHoursMinutes } from '$lib/utils/time'
  import { Axis, Highlight, Layer, Chart as LayerChart, Spline, Text, Tooltip } from 'layerchart'
  import { CUTOFF_TIME, X_AXIS_DIVISIONS } from '$lib/constants/scores'

  function generateAxisTicks(scale: { domain: () => number[] }, divisions: number): number[] {
    const [min, max] = scale.domain()
    if (min === undefined || max === undefined) return []
    const step = (max - min) / divisions
    return Array.from({ length: divisions + 1 }, (_, i) => min + step * i)
  }

  interface Props {
    class?: string
    graphData: LeaderboardGraphEntry
    rank: number
  }

  let { class: className = '', graphData, rank }: Props = $props()

  const clientConfigQuery = useClientConfig()
  const clientConfig = $derived(clientConfigQuery.data)

  const color = $derived.by(() => {
    if (rank === 1) return 'var(--foreground-gold-l0)'
    if (rank === 2) return 'var(--foreground-silver-l0)'
    if (rank === 3) return 'var(--foreground-bronze-l0)'
    return 'var(--foreground-l0)'
  })

  const flatPoints = $derived(
    graphData.points
      .filter(p => p.time <= CUTOFF_TIME)
      .toSorted((a, b) => a.time - b.time)
      .map(p => ({
        teamId: graphData.id,
        teamName: graphData.name,
        time: p.time,
        score: p.score,
        color,
      }))
  )

  const startTime = $derived(clientConfig?.startTime ?? 0)

  const useMinutesFormat = $derived.by(() => {
    if (flatPoints.length === 0) return false
    const times = flatPoints.map(p => p.time)
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    const minRangeForHoursOnly = (X_AXIS_DIVISIONS + 1) * 60 * 60 * 1000
    return maxTime - minTime < minRangeForHoursOnly
  })

  const chartConfig = $derived<ChartConfig>({
    [graphData.id]: { label: graphData.name, color },
  })
</script>

<Chart.Container config={chartConfig} class={className}>
  <LayerChart
    data={flatPoints}
    x="time"
    y="score"
    yDomain={[0, null]}
    yNice
    padding={{ bottom: 24, left: 4 }}
    tooltip={{ mode: 'quadtree' }}
  >
    {#snippet children()}
      <Layer type="svg">
        <Axis
          placement="bottom"
          rule
          ticks={scale => (flatPoints.length > 0 ? generateAxisTicks(scale, X_AXIS_DIVISIONS) : [])}
          format={(d: number) =>
            useMinutesFormat
              ? formatRelativeHoursMinutes(d, startTime)
              : formatRelativeHours(d, startTime)}
        >
          {#snippet tickLabel({ props, index })}
            {@const anchor = index === 0 ? 'start' : index === X_AXIS_DIVISIONS ? 'end' : 'middle'}
            <Text {...props} textAnchor={anchor} dy={4} />
          {/snippet}
        </Axis>

        <Spline
          data={flatPoints}
          class="stroke-2"
          stroke={color}
          style="stroke-linecap: round; stroke-linejoin: round;"
        />

        <Highlight points lines />
      </Layer>

      <Tooltip.Root anchor="top-right" motion="none" variant="none">
        {#snippet children({ data })}
          <div
            class="border-border/50 bg-background-l1 z-50 rounded-lg border px-3 py-2 text-xs shadow-xl"
          >
            <div class="text-foreground-l3 mb-1.5">
              <div>{formatRelativeHoursMinutes(data.time, startTime)}</div>
              <div class="text-[10px]">{formatLocalTime(data.time)}</div>
            </div>
            <div class="flex items-center gap-2">
              <div class="size-2.5 rounded-sm" style="background-color: {data.color}"></div>
              <span class="font-medium wrap-anywhere">{data.teamName}</span>
              <span class="text-foreground-l3 ml-auto tabular-nums">
                {data.score.toLocaleString()} pts
              </span>
            </div>
          </div>
        {/snippet}
      </Tooltip.Root>
    {/snippet}
  </LayerChart>
</Chart.Container>
