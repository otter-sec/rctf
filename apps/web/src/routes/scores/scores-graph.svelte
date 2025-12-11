<script lang="ts">
  import { Chart, type ChartConfig } from '$lib/components'
  import { useCurrentUser, useLeaderboardWithGraph, useSelfUserGraph } from '$lib/query'
  import { formatLocalTime, formatRelativeHours, formatRelativeHoursMinutes } from '$lib/utils/time'
  import { flatGroup } from 'd3-array'
  import { Axis, Highlight, Layer, Chart as LayerChart, Spline, Tooltip } from 'layerchart'
  import { CUTOFF_TIME, MEDAL_COLORS, PAGE_SIZE, RANK_COLORS, SELF_COLOR } from './constants'

  type GraphEntry = {
    id: string
    name: string
    points: { time: number; score: number }[]
  }

  interface Props {
    class?: string
    hoveredTeamId?: string | null
    offset?: number
    solveHighlight?: { teamId: string; time: number } | null
    graphData?: GraphEntry[]
    showTop3Context?: boolean
  }

  let {
    class: className = '',
    hoveredTeamId = null,
    offset = 0,
    solveHighlight = null,
    graphData,
    showTop3Context = true,
  }: Props = $props()

  const userQuery = useCurrentUser()
  const currentUser = $derived($userQuery.data)
  const globalPlace = $derived(currentUser?.globalPlace ?? null)

  const selfIsOnCurrentPage = $derived.by(() => {
    if (!globalPlace) return true
    const startRank = offset + 1
    const endRank = offset + PAGE_SIZE
    return globalPlace >= startRank && globalPlace <= endRank
  })

  const selfGraphQuery = $derived(useSelfUserGraph(selfIsOnCurrentPage ? null : globalPlace))

  // NOTE(es3n1n): heavily relying on a fact that this will be cached
  const firstPageQuery = $derived(useLeaderboardWithGraph({ limit: PAGE_SIZE, offset: 0 }))
  type TeamMeta = {
    index: number
    color: string
    isContext: boolean
    isSelf: boolean
  }

  const processedData = $derived.by(() => {
    const rawGraph = graphData ?? []
    const rawTop3 =
      offset > 0 && showTop3Context ? ($firstPageQuery.data?.graph ?? []).slice(0, 3) : []
    const selfGraphData = $selfGraphQuery.data

    const filterByTime = (entries: GraphEntry[]) =>
      entries
        .map(e => ({
          ...e,
          points: e.points.filter(p => p.time <= CUTOFF_TIME),
        }))
        .filter(e => e.points.length > 0)

    const mainTeams = filterByTime(rawGraph)
    const contextTeams = filterByTime(rawTop3)

    const mainIds = new Set(mainTeams.map(t => t.id))
    const uniqueContextTeams = contextTeams.filter(t => !mainIds.has(t.id))

    const teamMeta = new Map<string, TeamMeta>()

    uniqueContextTeams.forEach((team, i) => {
      teamMeta.set(team.id, {
        index: i,
        color: MEDAL_COLORS[i]!,
        isContext: true,
        isSelf: false,
      })
    })

    mainTeams.forEach((team, i) => {
      const useMedal = offset === 0 && i < 3
      const isSelf = currentUser?.id === team.id
      teamMeta.set(team.id, {
        index: i,
        color: isSelf
          ? SELF_COLOR
          : useMedal
            ? MEDAL_COLORS[i]!
            : RANK_COLORS[i % RANK_COLORS.length]!,
        isContext: false,
        isSelf,
      })
    })

    let allTeams = [...uniqueContextTeams, ...mainTeams]

    if (selfGraphData && !mainIds.has(selfGraphData.id) && !selfIsOnCurrentPage) {
      const filteredSelf = filterByTime([selfGraphData])
      if (filteredSelf.length > 0) {
        const selfEntry = filteredSelf[0]!
        teamMeta.set(selfEntry.id, {
          index: -1,
          color: SELF_COLOR,
          isContext: false,
          isSelf: true,
        })
        allTeams = [...allTeams, selfEntry]
      }
    }

    const flatPoints = allTeams.flatMap(team => {
      const meta = teamMeta.get(team.id)!
      return team.points
        .toSorted((a, b) => a.time - b.time)
        .map(p => ({
          teamId: team.id,
          teamName: team.name,
          time: p.time,
          score: p.score,
          ...meta,
        }))
    })

    const startTime = flatPoints.length > 0 ? Math.min(...flatPoints.map(p => p.time)) : 0

    return { allTeams, teamMeta, flatPoints, startTime }
  })

  const { flatPoints, teamMeta, startTime } = $derived(processedData)
  const dataByTeam = $derived(flatGroup(flatPoints, d => d.teamId))

  const solveHighlightPoint = $derived.by(() => {
    if (!solveHighlight) return null
    const teamData = dataByTeam.find(([id]) => id === solveHighlight.teamId)
    if (!teamData) return null

    const [, points] = teamData
    if (points.length === 0) return null

    const targetTime = solveHighlight.time

    const point = points.find(p => p.time === targetTime)
    if (point) return point

    const closestPoint = points.reduce((closest, current) => {
      const currentDiff = Math.abs(current.time - targetTime)
      const closestDiff = Math.abs(closest.time - targetTime)
      return currentDiff < closestDiff ? current : closest
    })

    return closestPoint
  })

  const chartConfig = $derived<ChartConfig>(
    Object.fromEntries(
      processedData.allTeams.map(team => {
        const meta = teamMeta.get(team.id)!
        return [team.id, { label: team.name, color: meta.color }]
      })
    )
  )
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
    {#snippet children({ context })}
      <Layer type="svg">
        <Axis
          placement="bottom"
          rule
          format={(d: number) => formatRelativeHours(d, startTime)}
          tickLabelProps={{ textAnchor: 'start', dy: 4 }}
        />

        {#each dataByTeam as [teamId, points]}
          {@const meta = teamMeta.get(teamId)!}
          {@const isDimmed = hoveredTeamId !== null && hoveredTeamId !== teamId && !meta.isSelf}
          <Spline
            data={points}
            class={meta.isSelf ? 'stroke-3' : 'stroke-2'}
            stroke={isDimmed ? 'var(--foreground-l5)' : meta.color}
            style="opacity: {isDimmed
              ? 0.15
              : meta.isContext
                ? 0.3
                : 1}; transition: opacity 150ms ease, stroke 150ms ease; stroke-linecap: round; stroke-linejoin: round;"
          />
        {/each}

        {#if solveHighlightPoint}
          {@const x = context.xScale(solveHighlightPoint.time)}
          {@const y = context.yScale(solveHighlightPoint.score)}
          {@const yRange = context.yScale.range()}
          {@const xRange = context.xScale.range()}
          <line
            x1={x}
            y1={yRange[0]}
            x2={x}
            y2={yRange[1]}
            stroke={solveHighlightPoint.color}
            stroke-width={1}
            stroke-dasharray="4 4"
            class="pointer-events-none"
            style="opacity: 0.5; transition: all 150ms ease;"
          />
          <line
            x1={xRange[0]}
            y1={y}
            x2={xRange[1]}
            y2={y}
            stroke={solveHighlightPoint.color}
            stroke-width={1}
            stroke-dasharray="4 4"
            class="pointer-events-none"
            style="opacity: 0.5; transition: all 150ms ease;"
          />
          <circle
            cx={x}
            cy={y}
            r={5}
            fill={solveHighlightPoint.color}
            stroke="var(--background-l0)"
            stroke-width={3}
            class="pointer-events-none"
            style="transition: all 150ms ease;"
          />
        {/if}

        <Highlight points lines />
      </Layer>

      <Tooltip.Root anchor="top-right" motion="none">
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
