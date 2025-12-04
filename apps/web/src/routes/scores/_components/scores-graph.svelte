<script lang="ts">
  import { Chart, type ChartConfig } from '$lib/components'
  import {
    useCurrentUser,
    useLeaderboardGraph,
    useSelfUserGraph,
  } from '$lib/query'
  import {
    formatLocalTime,
    formatRelativeHours,
    formatRelativeHoursMinutes,
  } from '$lib/utils/time'
  import { flatGroup } from 'd3-array'
  import {
    Axis,
    Highlight,
    Layer,
    Chart as LayerChart,
    Spline,
    Tooltip,
  } from 'layerchart'
  import { PAGE_SIZE } from '../_lib'

  interface Props {
    class?: string
    hoveredTeamId?: string | null
    offset?: number
    solveHighlight?: { teamId: string; time: number } | null
  }

  let {
    class: className = '',
    hoveredTeamId = null,
    offset = 0,
    solveHighlight = null,
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

  const selfGraphQuery = $derived(
    useSelfUserGraph(selfIsOnCurrentPage ? null : globalPlace)
  )

  const graphQuery = $derived(
    useLeaderboardGraph({ limit: 10, offset, division: 'open' })
  )
  const top3Query = $derived(
    useLeaderboardGraph({ limit: 3, offset: 0, division: 'open' })
  )

  const MEDAL_COLORS = [
    'var(--foreground-gold-l0)',
    'var(--foreground-silver-l0)',
    'var(--foreground-bronze-l0)',
  ] as const

  const RANK_COLORS = [
    'var(--foreground-first)',
    'var(--foreground-second)',
    'var(--foreground-third)',
    'var(--foreground-fourth)',
    'var(--foreground-fifth)',
    'var(--foreground-sixth)',
    'var(--foreground-seventh)',
    'var(--foreground-eighth)',
    'var(--foreground-ninth)',
    'var(--foreground-tenth)',
  ] as const

  const SELF_COLOR = 'var(--foreground-self-l0)'

  // TODO(enscribe): Remove cutoff filter
  const CUTOFF_TIME = new Date('2025-10-28T03:00:00.000Z').getTime()

  type GraphEntry = NonNullable<typeof $graphQuery.data>[number]
  type TeamMeta = {
    index: number
    color: string
    isContext: boolean
    isSelf: boolean
  }

  const processedData = $derived.by(() => {
    const rawGraph = $graphQuery.data ?? []
    const rawTop3 = offset > 0 ? ($top3Query.data ?? []) : []
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

    if (
      selfGraphData &&
      !mainIds.has(selfGraphData.id) &&
      !selfIsOnCurrentPage
    ) {
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

    const startTime =
      flatPoints.length > 0 ? Math.min(...flatPoints.map(p => p.time)) : 0

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
          {@const isDimmed =
            hoveredTeamId !== null && hoveredTeamId !== teamId && !meta.isSelf}
          <Spline
            data={points}
            class={meta.isSelf ? 'stroke-3' : 'stroke-2'}
            stroke={isDimmed ? 'var(--foreground-l5)' : meta.color}
            style="opacity: {isDimmed ? 0.15 : meta.isContext ? 0.3 : 1}"
          />
        {/each}

        {#if solveHighlightPoint}
          {@const x = context.xScale(solveHighlightPoint.time)}
          {@const y = context.yScale(solveHighlightPoint.score)}
          <circle
            cx={x}
            cy={y}
            r={6}
            fill={solveHighlightPoint.color}
            stroke="var(--background-l0)"
            stroke-width={3}
            class="pointer-events-none"
          />
        {/if}

        <Highlight points lines />
      </Layer>

      <Tooltip.Root>
        {#snippet children({ data })}
          <div
            class="border-border/50 bg-background-l1 rounded-lg border px-3 py-2 text-xs shadow-xl"
          >
            <div class="text-foreground-l3 mb-1.5">
              <div>{formatRelativeHoursMinutes(data.time, startTime)}</div>
              <div class="text-[10px]">{formatLocalTime(data.time)}</div>
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
