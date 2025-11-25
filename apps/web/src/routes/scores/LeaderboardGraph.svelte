<script lang="ts">
  import type { LeaderboardGraphEntry } from '$lib/api'
  import { Chart, type ChartConfig } from '$lib/components'
  import { flatGroup } from 'd3-array'
  import {
    Axis,
    Highlight,
    Layer,
    Chart as LayerChart,
    Spline,
    Tooltip,
  } from 'layerchart'

  let { graph }: { graph: LeaderboardGraphEntry[] } = $props()

  // TEMPORARY: Cut off data
  const cutoffDate = new Date('2025-10-28T03:00:00.000Z')
  const cutoffTimestamp = cutoffDate.getTime()

  // TEMPORARY: Filter graph data to only include points before the cutoff
  const filteredGraph = $derived(
    graph
      .map(entry => ({
        ...entry,
        points: entry.points.filter(point => point.time <= cutoffTimestamp),
      }))
      .filter(entry => entry.points.length > 0)
  )

  const teamColors: string[] = [
    'oklch(0.65 0.25 30)', // red-orange
    'oklch(0.65 0.22 145)', // green
    'oklch(0.60 0.25 260)', // blue
    'oklch(0.70 0.20 50)', // orange
    'oklch(0.55 0.25 300)', // purple
    'oklch(0.65 0.20 180)', // teal
    'oklch(0.75 0.18 90)', // yellow-green
    'oklch(0.60 0.22 330)', // magenta
    'oklch(0.55 0.20 220)', // indigo
    'oklch(0.70 0.15 60)', // gold
  ]

  const chartConfig = $derived(
    Object.fromEntries(
      filteredGraph.map((entry, i) => [
        entry.id,
        {
          label: entry.name,
          color: teamColors[i % teamColors.length],
        },
      ])
    ) as ChartConfig
  )

  type FlatDataPoint = {
    teamId: string
    teamName: string
    time: number
    score: number
    color: string
  }

  const flatData = $derived<FlatDataPoint[]>(
    filteredGraph.flatMap((entry, i) =>
      entry.points
        .toSorted((a, b) => a.time - b.time)
        .map(point => ({
          teamId: entry.id,
          teamName: entry.name,
          time: point.time,
          score: point.score,
          color: teamColors[i % teamColors.length]!,
        }))
    )
  )

  const dataByTeam = $derived(
    flatGroup(flatData, (d: FlatDataPoint) => d.teamId)
  )

  const startTime = $derived(
    flatData.length > 0 ? Math.min(...flatData.map(d => d.time)) : 0
  )

  const formatRelativeTime = (timestamp: number) => {
    const hoursFromStart = (timestamp - startTime) / (1000 * 60 * 60)
    const roundedHours = Math.round(hoursFromStart)
    return `+${roundedHours}h`
  }

  const formatTooltipRelative = (timestamp: number) => {
    const hoursFromStart = (timestamp - startTime) / (1000 * 60 * 60)
    const hours = Math.floor(hoursFromStart)
    const minutes = Math.round((hoursFromStart - hours) * 60)
    if (minutes === 0) {
      return `+${hours}h`
    }
    return `+${hours}h ${minutes}m`
  }

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }
</script>

<Chart.Container config={chartConfig} class="h-[400px] w-full">
  <LayerChart
    data={flatData}
    x="time"
    y="score"
    yDomain={[0, null]}
    yNice
    padding={{ left: 16, bottom: 48, right: 16, top: 16 }}
    tooltip={{ mode: 'quadtree' }}
  >
    {#snippet children({ context })}
      <Layer type="svg">
        <Axis
          placement="bottom"
          rule
          format={(d: number) => formatRelativeTime(d)}
        />

        {#each dataByTeam as [teamId, teamData]}
          {@const teamIndex = filteredGraph.findIndex(e => e.id === teamId)}
          {@const color = teamColors[teamIndex % teamColors.length]}
          <Spline data={teamData} class="stroke-[2.5]" stroke={color} />
        {/each}

        <Highlight points lines />
      </Layer>

      <Tooltip.Root>
        {#snippet children({ data })}
          <div
            class="border-border/50 bg-background rounded-lg border px-3 py-2 text-xs shadow-xl"
          >
            <div class="text-muted-foreground mb-1.5">
              <div>{formatTooltipRelative(data.time)}</div>
              <div class="text-[10px]">{formatDateTime(data.time)}</div>
            </div>
            <div class="flex items-center gap-2">
              <div
                class="h-2.5 w-2.5 rounded-sm"
                style="background-color: {data.color}"
              ></div>
              <span class="font-medium wrap-anywhere">{data.teamName}</span>
              <span class="text-muted-foreground ml-auto tabular-nums">
                {data.score.toLocaleString()} pts
              </span>
            </div>
          </div>
        {/snippet}
      </Tooltip.Root>
    {/snippet}
  </LayerChart>
</Chart.Container>
