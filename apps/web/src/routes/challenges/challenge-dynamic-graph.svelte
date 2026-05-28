<script lang="ts">
  import ChartContainer from '$lib/components/ui/chart/chart-container.svelte'
  import { SELF_COLOR, X_AXIS_DIVISIONS } from '$lib/constants/scores'
  import { useClientConfig, useCurrentUser } from '$lib/query'
  import { getStableRankColor } from '$lib/utils'
  import { formatLocalTime, formatRelativeHours, formatRelativeHoursMinutes } from '$lib/utils/time'
  import { flatGroup } from 'd3-array'
  import { Axis, ChartCore, Highlight, Spline, Svg, Text, Tooltip } from 'layerchart/svg'

  // reserve enough room below the plot for the x-axis tick labels so they don't
  // sit flush against (or bleed past) the container bottom, where the scroll
  // area's top fade would paint over them
  const AXIS_PADDING_PX = 24

  type GraphEntry = {
    id: string
    name: string
    points: { time: number; score: number }[]
  }

  interface Props {
    // the (windowed) set of teams to draw
    graphData: GraphEntry[]
    // stable per-team line color keyed by team id (by global rank), so colors
    // don't shift as teams scroll in and out of the windowed set
    teamColors?: Record<string, string>
    // teams drawn as dimmed context (e.g. the pinned top 3 once scrolled past)
    contextTeamIds?: Record<string, true>
    hoveredTeamId?: string | null
  }

  let { graphData, teamColors, contextTeamIds, hoveredTeamId = null }: Props = $props()

  const clientConfigQuery = useClientConfig()
  const startTime = $derived(clientConfigQuery.data?.startTime ?? 0)

  const userQuery = useCurrentUser()
  const currentUser = $derived(userQuery.data)

  function generateAxisTicks(scale: { domain: () => number[] }, divisions: number): number[] {
    const [min, max] = scale.domain()
    if (min === undefined || max === undefined) return []
    const step = (max - min) / divisions
    return Array.from({ length: divisions + 1 }, (_, i) => min + step * i)
  }

  type TeamMeta = { color: string; isSelf: boolean; isContext: boolean }

  const processedData = $derived.by(() => {
    const teamMeta: Record<string, TeamMeta> = {}
    for (const team of graphData) {
      const isSelf = currentUser?.id === team.id
      const color = isSelf ? SELF_COLOR : (teamColors?.[team.id] ?? getStableRankColor(team.id))
      teamMeta[team.id] = {
        color,
        isSelf,
        isContext: contextTeamIds?.[team.id] ?? false,
      }
    }

    const flatPoints = graphData.flatMap(team => {
      const meta = teamMeta[team.id]!
      return team.points.map(p => ({
        teamId: team.id,
        teamName: team.name,
        time: p.time,
        score: p.score,
        ...meta,
      }))
    })

    return { teamMeta, flatPoints }
  })

  const { flatPoints, teamMeta } = $derived(processedData)

  const timeBounds = $derived.by(() => {
    if (flatPoints.length === 0) return null
    let minTime = Infinity
    let maxTime = -Infinity
    for (const p of flatPoints) {
      if (p.time < minTime) minTime = p.time
      if (p.time > maxTime) maxTime = p.time
    }
    return { minTime, maxTime }
  })

  const xDomain = $derived.by<[number, number] | undefined>(() => {
    if (!clientConfigQuery.data || !timeBounds) return undefined
    return [startTime, Math.max(timeBounds.maxTime, startTime)]
  })

  const dataByTeam = $derived(flatGroup(flatPoints, d => d.teamId))

  const useMinutesFormat = $derived.by(() => {
    if (!timeBounds) return false
    const minRangeForHoursOnly = (X_AXIS_DIVISIONS + 1) * 60 * 60 * 1000
    return timeBounds.maxTime - timeBounds.minTime < minRangeForHoursOnly
  })
</script>

<ChartContainer data-dynamic-graph>
  <ChartCore
    data={flatPoints}
    x="time"
    y="score"
    {xDomain}
    yDomain={[0, null]}
    yNice
    padding={{ bottom: AXIS_PADDING_PX }}
    tooltipContext={{ mode: 'quadtree' }}
  >
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
        {@const meta = teamMeta[teamId]!}
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
            <strong>{data.score.toLocaleString()} pts</strong>
          </tooltip-team>
        </graph-tooltip>
      {/snippet}
    </Tooltip.Root>
  </ChartCore>
</ChartContainer>

<style>
  :global([data-dynamic-graph]) {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    /* ChartContainer ships `aspect-video`; pin to the parent height instead so
       the chart can never lay out taller than its box and spill over the list */
    aspect-ratio: auto;
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
