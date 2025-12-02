<script lang="ts">
  import { Chart, type ChartConfig } from '$lib/components'
  import { useLeaderboardGraph } from '$lib/query'
  import { flatGroup } from 'd3-array'
  import {
    Axis,
    Highlight,
    Layer,
    Chart as LayerChart,
    Spline,
    Tooltip,
  } from 'layerchart'

  interface Props {
    class?: string
    hoveredTeamId?: string | null
    offset?: number
  }

  let {
    class: className = '',
    hoveredTeamId = null,
    offset = 0,
  }: Props = $props()

  const graphQuery = $derived(
    useLeaderboardGraph({ limit: 10, offset, division: 'open' })
  )
  const graph = $derived($graphQuery.data ?? [])

  // TODO(enscribe): Don't cut off data
  const cutoffDate = new Date('2025-10-28T03:00:00.000Z')
  const cutoffTimestamp = cutoffDate.getTime()

  // TODO(enscribe): Don't cut off data
  const filteredGraph = $derived(
    graph
      .map(entry => ({
        ...entry,
        points: entry.points.filter(point => point.time <= cutoffTimestamp),
      }))
      .filter(entry => entry.points.length > 0)
  )

  const teamColors: string[] = [
    'var(--foreground-first-l0)',
    'var(--foreground-second-l0)',
    'var(--foreground-third-l0)',
    'var(--foreground-fourth)',
    'var(--foreground-fifth)',
    'var(--foreground-sixth)',
    'var(--foreground-seventh)',
    'var(--foreground-eighth)',
    'var(--foreground-ninth)',
    'var(--foreground-tenth)',
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
    return roundedHours === 0 ? '0h' : `+${roundedHours}h`
  }

  const formatTooltipRelative = (timestamp: number) => {
    const hoursFromStart = (timestamp - startTime) / (1000 * 60 * 60)
    const hours = Math.floor(hoursFromStart)
    const minutes = Math.round((hoursFromStart - hours) * 60)
    const prefix = hours === 0 && minutes === 0 ? '' : '+'
    if (minutes === 0) {
      return hours === 0 ? '0h' : `+${hours}h`
    }
    return `${prefix}${hours}h ${minutes}m`
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

<Chart.Container config={chartConfig} class={className}>
  <LayerChart
    data={flatData}
    x="time"
    y="score"
    yDomain={[0, null]}
    yNice
    padding={{ bottom: 24 }}
    tooltip={{ mode: 'quadtree' }}
  >
    {#snippet children({ context })}
      <Layer type="svg">
        <Axis
          placement="bottom"
          tickLabelProps={{ textAnchor: 'start', dx: -2, dy: 4 }}
          rule
          format={(d: number) => formatRelativeTime(d)}
        />
        {#each dataByTeam as [teamId, teamData]}
          {@const teamIndex = filteredGraph.findIndex(e => e.id === teamId)}
          {@const color = teamColors[teamIndex % teamColors.length]}
          {@const isDimmed = hoveredTeamId !== null && hoveredTeamId !== teamId}
          <Spline
            data={teamData}
            class="stroke-2"
            stroke={isDimmed ? 'var(--foreground-l5)' : color}
            style="opacity: {isDimmed ? 0.2 : 1}"
          />
        {/each}

        <Highlight points lines />
      </Layer>

      <Tooltip.Root>
        {#snippet children({ data })}
          <div
            class="border-border/50 bg-background-l1 rounded-lg border px-3 py-2 text-xs shadow-xl"
          >
            <div class="text-foreground-l3 mb-1.5">
              <div>{formatTooltipRelative(data.time)}</div>
              <div class="text-[10px]">{formatDateTime(data.time)}</div>
            </div>
            <div class="flex items-center gap-2">
              <div
                class="h-2.5 w-2.5 rounded-sm"
                style="background-color: {data.color}"
              ></div>
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
