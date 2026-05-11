<script lang="ts">
  import type { LeaderboardGraphEntry } from '@rctf/types'
  import ChartContainer from '$lib/components/ui/chart/chart-container.svelte'
  import { type ChartConfig } from '$lib/components/ui/chart/chart-utils'
  import { CUTOFF_TIME, X_AXIS_DIVISIONS } from '$lib/constants/scores'
  import { useClientConfig } from '$lib/query'
  import { getCategoryConfig, getCategoryStyle } from '$lib/utils'
  import { formatLocalTime, formatRelativeHours, formatRelativeHoursMinutes } from '$lib/utils/time'
  import { Axis, ChartCore, Highlight, Svg, Text, Tooltip } from 'layerchart/svg'
  import { axisTicks, tickTextAnchor } from './profile-chart-utils'

  type SolveInput = {
    id: string
    name: string
    category: string
    createdAt: number
    points: number | null
  }

  type ScorePoint = {
    key: string
    kind: 'sample' | 'solve'
    teamId: string
    teamName: string
    time: number
    score: number
    color: string
    challengeName?: string
    categoryLabel?: string
    points?: number | null
    style?: string
  }

  type ScoreLinePoint = {
    time: number
    score: number
  }

  type Scale = (value: number) => number

  const domainPadding = 30 * 60 * 1000

  function categoryDisplay(category: string) {
    const config = getCategoryConfig(category)
    return {
      label: config.name,
      style: getCategoryStyle(config.color),
    }
  }

  function buildStepPath(points: ScoreLinePoint[], xScale: Scale, yScale: Scale) {
    const first = points[0]
    if (!first) return ''

    let path = `M ${xScale(first.time)} ${yScale(first.score)}`
    for (const point of points.slice(1)) {
      path += ` H ${xScale(point.time)} V ${yScale(point.score)}`
    }
    return path
  }

  function chartTimeDomain(points: ScoreLinePoint[]): [number, number] | undefined {
    const first = points[0]
    const last = points.at(-1)
    if (!first || !last) return undefined
    if (first.time === last.time) {
      return [first.time - domainPadding, first.time + domainPadding]
    }
    return [first.time, last.time]
  }

  interface Props {
    class?: string
    graphData: LeaderboardGraphEntry
    rank: number
    solves?: SolveInput[]
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

  const sampledPoints = $derived<ScorePoint[]>(
    graphData.points
      .filter(p => p.time <= CUTOFF_TIME)
      .toSorted((a, b) => a.time - b.time)
      .map(p => ({
        key: `sample-${p.time}`,
        kind: 'sample',
        teamId: graphData.id,
        teamName: graphData.name,
        time: p.time,
        score: p.score,
        color,
      }))
  )

  const solvePoints = $derived.by<ScorePoint[]>(() => {
    let score = 0
    return solves
      .filter(solve => solve.createdAt <= CUTOFF_TIME)
      .toSorted((a, b) => a.createdAt - b.createdAt)
      .map(solve => {
        score += solve.points ?? 0
        const category = categoryDisplay(solve.category)

        return {
          key: `solve-${solve.id}`,
          kind: 'solve',
          teamId: graphData.id,
          teamName: graphData.name,
          challengeName: solve.name,
          categoryLabel: category.label,
          time: solve.createdAt,
          score,
          points: solve.points,
          color,
          style: category.style,
        }
      })
  })

  const chartPoints = $derived(solvePoints.length > 0 ? solvePoints : sampledPoints)
  const scoreLinePoints = $derived.by<ScoreLinePoint[]>(() => {
    if (solvePoints.length === 0) {
      return sampledPoints.map(point => ({ time: point.time, score: point.score }))
    }

    const firstSolve = solvePoints[0]!
    return [
      { time: firstSolve.time, score: 0 },
      ...solvePoints.map(point => ({ time: point.time, score: point.score })),
    ]
  })
  const xDomain = $derived(chartTimeDomain(scoreLinePoints))
  const startTime = $derived(clientConfig?.startTime ?? 0)

  const useMinutesFormat = $derived.by(() => {
    if (chartPoints.length === 0) return false
    const times = chartPoints.map(p => p.time)
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    const minRangeForHoursOnly = (X_AXIS_DIVISIONS + 1) * 60 * 60 * 1000
    return maxTime - minTime < minRangeForHoursOnly
  })

  const chartConfig = $derived<ChartConfig>({
    [graphData.id]: { label: graphData.name, color },
  })
</script>

<ChartContainer config={chartConfig} class={className}>
  <ChartCore
    data={chartPoints}
    x="time"
    y="score"
    {xDomain}
    yDomain={[0, null]}
    yNice
    padding={{ bottom: 24, left: 4 }}
    tooltipContext={{ mode: 'quadtree' }}
  >
    {#snippet children({ context })}
      <Svg>
        <Axis
          placement="bottom"
          rule
          ticks={scale => (chartPoints.length > 0 ? axisTicks(scale, X_AXIS_DIVISIONS) : [])}
          format={(d: number) =>
            useMinutesFormat
              ? formatRelativeHoursMinutes(d, startTime)
              : formatRelativeHours(d, startTime)}
        >
          {#snippet tickLabel({ props, index })}
            <Text {...props} textAnchor={tickTextAnchor(index, X_AXIS_DIVISIONS)} dy={4} />
          {/snippet}
        </Axis>

        <path
          d={buildStepPath(scoreLinePoints, context.xScale, context.yScale)}
          fill="none"
          stroke={color}
          stroke-width={2}
          stroke-linecap="round"
          stroke-linejoin="round"
          class="pointer-events-none"
        />

        {#each solvePoints as point (point.key)}
          <circle
            class="lc-point"
            style={point.style}
            cx={context.xScale(point.time)}
            cy={context.yScale(point.score)}
            r={3.5}
            fill="var(--category-background-l0)"
            stroke="var(--category-foreground-l1)"
            stroke-opacity={0.85}
            stroke-width={1.5}
          />
        {/each}

        <Highlight points={{ r: 5, strokeWidth: 3 }} />
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
            <div class="flex items-center gap-2" style={data.style}>
              <div
                class="size-2.5 rounded-sm"
                style="background-color: {data.kind === 'solve'
                  ? 'var(--category-background-l0)'
                  : data.color}; border: 1px solid {data.kind === 'solve'
                  ? 'var(--category-foreground-l1)'
                  : data.color};"
              ></div>
              <span class="font-medium wrap-anywhere">
                {data.kind === 'solve' ? data.challengeName : data.teamName}
              </span>
              <span class="text-foreground-l3 ml-auto tabular-nums">
                {data.score.toLocaleString()} pts
              </span>
            </div>
            {#if data.kind === 'solve'}
              <div class="text-foreground-l3 mt-1 flex justify-between gap-4">
                <span>{data.categoryLabel}</span>
                <span class="tabular-nums">{data.points?.toLocaleString() ?? 'n/a'} pts</span>
              </div>
            {/if}
          </div>
        {/snippet}
      </Tooltip.Root>
    {/snippet}
  </ChartCore>
</ChartContainer>
