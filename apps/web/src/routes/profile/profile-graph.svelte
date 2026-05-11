<script lang="ts">
  import type { LeaderboardGraphEntry } from '@rctf/types'
  import ChartContainer from '$lib/components/ui/chart/chart-container.svelte'
  import { type ChartConfig } from '$lib/components/ui/chart/chart-utils'
  import { CUTOFF_TIME, X_AXIS_DIVISIONS } from '$lib/constants/scores'
  import { useClientConfig } from '$lib/query'
  import { getCategoryConfig, getCategoryStyle } from '$lib/utils'
  import { formatLocalTime, formatRelativeHours, formatRelativeHoursMinutes } from '$lib/utils/time'
  import { Axis, ChartCore, Highlight, Rule, Spline, Svg, Text, Tooltip } from 'layerchart/svg'
  import { axisTicks, tickTextAnchor } from './profile-chart-utils'

  type SolveHairlineInput = {
    id: string
    category: string
    createdAt: number
  }

  type GraphDatum = {
    teamId: string
    teamName: string
    time: number
    score: number
    color: string
  }

  function categoryStyle(category: string) {
    return getCategoryStyle(getCategoryConfig(category).color)
  }

  function interpolateScoreAtTime(points: GraphDatum[], time: number) {
    if (points.length === 0) return 0
    const first = points[0]!
    const last = points.at(-1)!
    if (time <= first.time) return first.score
    if (time >= last.time) return last.score

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]!
      const next = points[i]!
      if (time > next.time) continue
      if (next.time === prev.time) return next.score

      const progress = (time - prev.time) / (next.time - prev.time)
      return prev.score + (next.score - prev.score) * progress
    }

    return last.score
  }

  interface Props {
    class?: string
    graphData: LeaderboardGraphEntry
    rank: number
    solves?: SolveHairlineInput[]
  }

  let { class: className = '', graphData, rank, solves = [] }: Props = $props()

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

  const solveHairlines = $derived.by(() => {
    const firstPoint = flatPoints[0]
    const lastPoint = flatPoints.at(-1)
    if (!firstPoint || !lastPoint) return []

    return solves
      .filter(solve => solve.createdAt >= firstPoint.time && solve.createdAt <= lastPoint.time)
      .toSorted((a, b) => a.createdAt - b.createdAt)
      .map(solve => ({
        key: solve.id,
        baseline: 0,
        time: solve.createdAt,
        score: interpolateScoreAtTime(flatPoints, solve.createdAt),
        style: categoryStyle(solve.category),
      }))
  })
</script>

<ChartContainer config={chartConfig} class={className}>
  <ChartCore
    data={flatPoints}
    x="time"
    y="score"
    yDomain={[0, null]}
    yNice
    padding={{ bottom: 24, left: 4 }}
    tooltipContext={{ mode: 'quadtree' }}
  >
    {#snippet children()}
      <Svg>
        <Axis
          placement="bottom"
          rule
          ticks={scale => (flatPoints.length > 0 ? axisTicks(scale, X_AXIS_DIVISIONS) : [])}
          format={(d: number) =>
            useMinutesFormat
              ? formatRelativeHoursMinutes(d, startTime)
              : formatRelativeHours(d, startTime)}
        >
          {#snippet tickLabel({ props, index })}
            <Text {...props} textAnchor={tickTextAnchor(index, X_AXIS_DIVISIONS)} dy={4} />
          {/snippet}
        </Axis>

        {#each solveHairlines as hairline (hairline.key)}
          <Rule
            data={[hairline]}
            x={['time', 'time']}
            y={['baseline', 'score']}
            stroke="var(--category-foreground-l1)"
            strokeWidth={1.5}
            opacity={0.35}
            style={hairline.style}
            class="pointer-events-none"
          />
        {/each}

        <Spline
          data={flatPoints}
          class="stroke-2"
          stroke={color}
          style="stroke-linecap: round; stroke-linejoin: round;"
        />

        <Highlight points lines />
      </Svg>

      <Tooltip.Root anchor="top-right" motion="none" variant="none">
        {#snippet children({ data })}
          <div
            class="border-border/50 bg-background-l1 z-50 rounded-lg border-2 px-3 py-2 text-xs shadow-xl"
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
  </ChartCore>
</ChartContainer>
