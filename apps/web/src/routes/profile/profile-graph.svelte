<script lang="ts">
  import type { LeaderboardGraphEntry } from '@rctf/types'
  import { Chart, type ChartConfig } from '$lib/components'
  import { formatLocalTime, formatRelativeHours, formatRelativeHoursMinutes } from '$lib/utils/time'
  import { Axis, Highlight, Layer, Chart as LayerChart, Spline, Tooltip } from 'layerchart'
  import { CUTOFF_TIME } from '../scores/constants'

  interface Props {
    class?: string
    graphData: LeaderboardGraphEntry
    rank: number
  }

  let { class: className = '', graphData, rank }: Props = $props()

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

  const startTime = $derived(flatPoints.length > 0 ? Math.min(...flatPoints.map(p => p.time)) : 0)

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
          format={(d: number) => formatRelativeHours(d, startTime)}
          tickLabelProps={{ textAnchor: 'start', dy: 4 }}
        />

        <Spline
          data={flatPoints}
          class="stroke-2"
          stroke={color}
          style="stroke-linecap: round; stroke-linejoin: round;"
        />

        <Highlight points lines />
      </Layer>

      <Tooltip.Root anchor="top-right" motion="none">
        {#snippet children({ data })}
          <div class="bg-background-l4 z-50 rounded-lg border px-3 py-2 text-xs shadow-xl">
            <div class="text-foreground-l3 mb-1.5">
              <div>{formatRelativeHoursMinutes(data.time, startTime)}</div>
              <div class="text-[10px]">{formatLocalTime(data.time)}</div>
            </div>
            <div class="flex items-center gap-2">
              <div class="size-2.5 rounded-sm" style="background-color: {data.color}"></div>
              <span class="max-w-48 truncate font-medium wrap-anywhere">{data.teamName}</span>
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
