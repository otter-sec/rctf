<script lang="ts">
  import ChartContainer from '$lib/components/ui/chart/chart-container.svelte'
  import { MEDAL_COLORS, PAGE_SIZE, SELF_COLOR, X_AXIS_DIVISIONS } from '$lib/constants/scores'
  import {
    useClientConfig,
    useCurrentUser,
    useLeaderboardWithGraph,
    useSelfUserGraph,
  } from '$lib/query'
  import { getRankColorForPosition } from '$lib/utils'
  import { formatLocalTime, formatRelativeHours, formatRelativeHoursMinutes } from '$lib/utils/time'
  import { flatGroup } from 'd3-array'
  import { Axis, ChartCore, Highlight, Spline, Svg, Text, Tooltip } from 'layerchart/svg'
  import { SCORE_GRAPH_AXIS_PADDING_PX } from './scores-layout-constants'

  function generateAxisTicks(scale: { domain: () => number[] }, divisions: number): number[] {
    const [min, max] = scale.domain()
    if (min === undefined || max === undefined) return []
    const step = (max - min) / divisions
    return Array.from({ length: divisions + 1 }, (_, i) => min + step * i)
  }

  type GraphEntry = {
    id: string
    name: string
    points: { time: number; score: number }[]
  }

  interface Props {
    hoveredTeamId?: string | null
    offset?: number
    solveHighlight?: { teamId: string; time: number } | null
    graphData?: GraphEntry[]
    teamRanks?: Map<string, number>
    teamColors?: Map<string, string>
    contextTeamIds?: Set<string>
    showTop3Context?: boolean
    showSelfContext?: boolean
    forceContextTeams?: boolean
    greyOutContext?: boolean
  }

  let {
    hoveredTeamId = null,
    offset = 0,
    solveHighlight = null,
    graphData,
    teamRanks,
    teamColors,
    contextTeamIds,
    showTop3Context = true,
    showSelfContext = true,
    forceContextTeams = false,
    greyOutContext = false,
  }: Props = $props()

  const clientConfigQuery = useClientConfig()
  const clientConfig = $derived(clientConfigQuery.data)

  const userQuery = useCurrentUser()
  const currentUser = $derived(userQuery.data)
  const globalPlace = $derived(currentUser?.globalPlace ?? null)

  const selfIsOnCurrentPage = $derived.by(() => {
    if (!globalPlace) return true
    const startRank = offset + 1
    const endRank = offset + PAGE_SIZE
    return globalPlace >= startRank && globalPlace <= endRank
  })

  const selfGraphQuery = useSelfUserGraph(() =>
    showSelfContext && !selfIsOnCurrentPage ? globalPlace : null
  )

  // NOTE(es3n1n): heavily relying on a fact that this will be cached
  const firstPageQuery = useLeaderboardWithGraph(() => ({ limit: PAGE_SIZE, offset: 0 }))
  type TeamMeta = {
    index: number
    color: string
    isContext: boolean
    isSelf: boolean
  }

  const startTime = $derived(clientConfig?.startTime ?? 0)
  const endTime = $derived(clientConfig?.endTime ?? Number.MAX_SAFE_INTEGER)

  const processedData = $derived.by(() => {
    const rawGraph = graphData ?? []
    const rawTop3 =
      (offset > 0 || forceContextTeams) && (showTop3Context || forceContextTeams)
        ? (firstPageQuery.data?.graph ?? []).slice(0, 3)
        : []
    const selfGraphData = selfGraphQuery.data

    const mainTeams = rawGraph
    const contextTeams = rawTop3

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
      const rank = teamRanks?.get(team.id)
      const isSelf = currentUser?.id === team.id
      const isContext = contextTeamIds?.has(team.id) ?? false

      let color: string
      if (isContext && greyOutContext) {
        color = 'var(--foreground-l5)'
      } else if (teamColors?.has(team.id)) {
        color = teamColors.get(team.id)!
      } else {
        color = getRankColorForPosition(rank, isSelf, team.id)
      }

      teamMeta.set(team.id, {
        index: i,
        color,
        isContext,
        isSelf,
      })
    })

    const filteredMainTeams = showSelfContext
      ? mainTeams
      : mainTeams.filter(t => t.id !== currentUser?.id)

    let allTeams = [...uniqueContextTeams, ...filteredMainTeams]

    if (
      showSelfContext &&
      selfGraphData &&
      !mainIds.has(selfGraphData.id) &&
      !selfIsOnCurrentPage
    ) {
      teamMeta.set(selfGraphData.id, {
        index: -1,
        color: SELF_COLOR,
        isContext: false,
        isSelf: true,
      })
      allTeams = [...allTeams, selfGraphData]
    }

    const flatPoints = allTeams.flatMap(team => {
      const meta = teamMeta.get(team.id)!
      return team.points.toReversed().map(p => ({
        teamId: team.id,
        teamName: team.name,
        time: p.time,
        score: p.score,
        ...meta,
      }))
    })

    return { allTeams, teamMeta, flatPoints }
  })

  const { flatPoints, teamMeta } = $derived(processedData)

  const xDomain = $derived.by<[number, number] | undefined>(() => {
    if (!clientConfig || flatPoints.length === 0) return undefined
    return [startTime, endTime]
  })

  const dataByTeam = $derived(flatGroup(flatPoints, d => d.teamId))

  const useMinutesFormat = $derived.by(() => {
    if (flatPoints.length === 0) return false
    // NOTE(es3n1n): doing Math.max(...items) on 8k items is causing issues on chromium,
    //  hence why we're doing this manually
    let minTime = Infinity
    let maxTime = -Infinity
    for (const p of flatPoints) {
      if (p.time < minTime) minTime = p.time
      if (p.time > maxTime) maxTime = p.time
    }
    const minRangeForHoursOnly = (X_AXIS_DIVISIONS + 1) * 60 * 60 * 1000
    return maxTime - minTime < minRangeForHoursOnly
  })

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
</script>

<ChartContainer data-score-graph>
  <ChartCore
    data={flatPoints}
    x="time"
    y="score"
    {xDomain}
    yDomain={[0, null]}
    yNice
    padding={{ bottom: SCORE_GRAPH_AXIS_PADDING_PX }}
    tooltipContext={{ mode: 'quadtree' }}
  >
    {#snippet children({ context })}
      <Svg>
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

        {#each dataByTeam as [teamId, points] (teamId)}
          {@const meta = teamMeta.get(teamId)!}
          {@const isDimmed = hoveredTeamId !== null && hoveredTeamId !== teamId && !meta.isSelf}
          <Spline
            data={points}
            stroke={isDimmed ? 'var(--foreground-l5)' : meta.color}
            style="stroke-width: {meta.isSelf ? 3 : 2}; opacity: {isDimmed
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
            data-highlight
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
            data-highlight
            style="opacity: 0.5; transition: all 150ms ease;"
          />
          <circle
            cx={x}
            cy={y}
            r={5}
            fill={solveHighlightPoint.color}
            stroke="var(--background-l1)"
            stroke-width={3}
            data-highlight
            style="transition: all 150ms ease;"
          />
        {/if}

        <Highlight points={{ r: 3, strokeWidth: 4 }} lines />
      </Svg>

      <Tooltip.Root anchor="top-right" motion="none" variant="none">
        {#snippet children({ data })}
          <graph-tooltip>
            <tooltip-time>
              <div>{formatRelativeHoursMinutes(data.time, startTime)}</div>
              <small>{formatLocalTime(data.time)}</small>
            </tooltip-time>
            <tooltip-team>
              <color-swatch style="background-color: {data.color}"></color-swatch>
              <span>{data.teamName}</span>
              <strong>
                {data.score.toLocaleString()} pts
              </strong>
            </tooltip-team>
          </graph-tooltip>
        {/snippet}
      </Tooltip.Root>
    {/snippet}
  </ChartCore>
</ChartContainer>

<style>
  :global([data-score-graph]) {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding-block: var(--score-graph-padding, 0);
    padding-inline: var(--score-graph-padding, 0);
  }

  [data-highlight] {
    pointer-events: none;
  }

  graph-tooltip {
    z-index: 50;
    display: block;
    padding-block: calc(var(--spacing) * 2);
    padding-inline: calc(var(--spacing) * 3);
    border: 2px solid var(--background-l5);
    border-radius: var(--radius-lg);
    background: var(--background-l4);
    box-shadow: 0 1.25rem 1.5rem -0.75rem rgb(0 0 0 / 40%);
    font-size: var(--text-xs);

    tooltip-time {
      display: block;
      margin-block-end: calc(var(--spacing) * 1.5);
      color: var(--foreground-l3);

      small {
        display: block;
        font-size: calc(var(--spacing) * 2.5);
      }
    }

    tooltip-team {
      display: flex;
      align-items: center;
      gap: calc(var(--spacing) * 2);

      color-swatch {
        width: calc(var(--spacing) * 2.5);
        height: calc(var(--spacing) * 2.5);
        border-radius: var(--radius-xs);
      }

      span {
        max-width: 12rem;
        overflow: hidden;
        text-overflow: ellipsis;
        overflow-wrap: anywhere;
        white-space: nowrap;
      }

      strong {
        margin-inline-start: auto;
        color: var(--foreground-l3);
        font-weight: 400;
        font-variant-numeric: tabular-nums;
      }
    }
  }
</style>
