<script lang="ts">
  import type { LeaderboardGraphEntry } from '@rctf/types'
  import ChartContainer from '$lib/components/ui/chart/chart-container.svelte'
  import { type ChartConfig } from '$lib/components/ui/chart/chart-utils'
  import { CUTOFF_TIME, X_AXIS_DIVISIONS } from '$lib/constants/scores'
  import { useClientConfig } from '$lib/query'
  import {
    getCategoryConfig,
    getCategoryKeyOrAlias,
    getCategoryStyle,
    type CategoryConfig,
  } from '$lib/utils'
  import { formatLocalTime, formatRelativeHours, formatRelativeHoursMinutes } from '$lib/utils/time'
  import { Axis, ChartCore, Highlight, Svg, Text, Tooltip } from 'layerchart/svg'
  import { axisTicks, compactNumber, integerTicks, tickTextAnchor } from './profile-chart-utils'

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
    categoryKey?: string
    categoryIcon?: CategoryConfig['icon']
    points?: number | null
    scoreBefore?: number
    style?: string
  }

  type ScoreLinePoint = {
    time: number
    score: number
  }

  type Scale = (value: number) => number

  const domainPadding = 30 * 60 * 1000
  const scoreLineColor = 'var(--foreground-l2)'

  function categoryDisplay(category: string) {
    const config = getCategoryConfig(category)
    return {
      key: getCategoryKeyOrAlias(category),
      icon: config.icon,
      color: `var(--foreground-${config.color}-l1)`,
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

  function buildLinePath(points: ScoreLinePoint[], xScale: Scale, yScale: Scale) {
    const first = points[0]
    if (!first) return ''

    let path = `M ${xScale(first.time)} ${yScale(first.score)}`
    for (const point of points.slice(1)) {
      path += ` L ${xScale(point.time)} ${yScale(point.score)}`
    }
    return path
  }

  function chartTimeDomain(
    points: ScoreLinePoint[],
    startTime: number
  ): [number, number] | undefined {
    const first = points[0]
    const last = points.at(-1)
    if (!first || !last) return undefined
    const min = startTime > 0 ? startTime : first.time

    if (first.time === last.time) {
      return [min, first.time + domainPadding]
    }
    return [min, last.time]
  }

  function chartScoreMax(points: ScoreLinePoint[]): number {
    return Math.max(1, ...points.map(point => point.score))
  }

  interface Props {
    class?: string
    graphData: LeaderboardGraphEntry
    solves?: SolveInput[]
  }

  let { class: className = '', graphData, solves = [] }: Props = $props()

  const clientConfigQuery = useClientConfig()
  const clientConfig = $derived(clientConfigQuery.data)

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
        color: scoreLineColor,
      }))
  )

  const solvePoints = $derived.by<ScorePoint[]>(() => {
    let score = 0
    return solves
      .filter(solve => solve.createdAt <= CUTOFF_TIME)
      .toSorted((a, b) => a.createdAt - b.createdAt)
      .map(solve => {
        const scoreBefore = score
        score += solve.points ?? 0
        const category = categoryDisplay(solve.category)

        return {
          key: `solve-${solve.id}`,
          kind: 'solve',
          teamId: graphData.id,
          teamName: graphData.name,
          challengeName: solve.name,
          categoryKey: category.key,
          categoryIcon: category.icon,
          time: solve.createdAt,
          score,
          scoreBefore,
          points: solve.points,
          color: category.color,
          style: category.style,
        }
      })
  })

  const chartPoints = $derived(solvePoints.length > 0 ? solvePoints : sampledPoints)
  const sampledLinePoints = $derived<ScoreLinePoint[]>(
    sampledPoints.map(point => ({ time: point.time, score: point.score }))
  )
  const scoreLinePoints = $derived.by<ScoreLinePoint[]>(() => {
    if (solvePoints.length === 0) {
      return sampledLinePoints
    }

    const firstSolve = solvePoints[0]!
    return [
      { time: firstSolve.time, score: 0 },
      ...solvePoints.map(point => ({ time: point.time, score: point.score })),
    ]
  })
  const domainPoints = $derived(
    solvePoints.length > 0 ? [...scoreLinePoints, ...sampledLinePoints] : scoreLinePoints
  )
  const startTime = $derived(clientConfig?.startTime ?? 0)
  const xDomain = $derived(
    chartTimeDomain(domainPoints.toSorted((a, b) => a.time - b.time), startTime)
  )
  const yMax = $derived(chartScoreMax(domainPoints))

  const useMinutesFormat = $derived.by(() => {
    if (chartPoints.length === 0) return false
    const times = chartPoints.map(p => p.time)
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    const minRangeForHoursOnly = (X_AXIS_DIVISIONS + 1) * 60 * 60 * 1000
    return maxTime - minTime < minRangeForHoursOnly
  })

  const chartConfig = $derived<ChartConfig>({
    [graphData.id]: { label: graphData.name, color: scoreLineColor },
  })
  const colorDomain = $derived(Array.from(new Set(chartPoints.map(point => point.color))))
</script>

<ChartContainer config={chartConfig} class={className}>
  <ChartCore
    data={chartPoints}
    x="time"
    y="score"
    c="color"
    {xDomain}
    yDomain={[0, yMax]}
    cDomain={colorDomain}
    cRange={colorDomain}
    yNice
    padding={{ bottom: 24, left: 44, right: 8, top: 8 }}
    tooltipContext={{ mode: 'quadtree' }}
  >
    {#snippet children({ context })}
      <Svg>
        <Axis
          placement="left"
          grid
          ticks={scale => integerTicks(scale)}
          format={(value: number) => compactNumber(value)}
          tickLabelProps={{ 'font-size': 10, dx: -10 }}
        />
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

        {#if solvePoints.length > 0 && sampledLinePoints.length > 1}
          <path
            d={buildLinePath(sampledLinePoints, context.xScale, context.yScale)}
            fill="none"
            stroke={scoreLineColor}
            stroke-width={1.5}
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-opacity={0.22}
            class="pointer-events-none"
          />
        {/if}

        <path
          d={buildStepPath(scoreLinePoints, context.xScale, context.yScale)}
          fill="none"
          stroke={scoreLineColor}
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
            r={4}
            fill="var(--category-background-l0)"
            stroke="var(--category-foreground-l1)"
            stroke-opacity={0.5}
            stroke-width={2}
          />
        {/each}

        <Highlight points={{ r: 5, stroke: 'transparent', strokeWidth: 0 }} />
      </Svg>

      <Tooltip.Root anchor="top-right" motion="none" variant="none">
        {#snippet children({ data })}
          <div
            class="border-background-l5 bg-background-l3 z-50 min-w-56 rounded-lg border-2 px-3 py-2 text-xs shadow-xl"
          >
            <div class="text-foreground-l3 mb-1.5">
              <div>{formatRelativeHoursMinutes(data.time, startTime)}</div>
              <div class="text-[10px]">{formatLocalTime(data.time)}</div>
            </div>
            {#if data.kind === 'solve'}
              {@const CategoryIcon = data.categoryIcon}
              <div class="flex items-center gap-2" style={data.style}>
                <CategoryIcon class="text-category-foreground-l1 size-3.5 shrink-0" />
                <div class="flex min-w-0 items-baseline gap-1 text-xs font-medium">
                  <span class="text-category-foreground-l1 shrink-0">
                    {data.categoryKey} /
                  </span>
                  <span class="text-category-foreground-l0 truncate">
                    {data.challengeName}
                  </span>
                </div>
              </div>
                <div class="mt-2 border-t-2 pt-2 tabular-nums">
                  <span class="text-foreground-l1">{data.scoreBefore?.toLocaleString()} pts</span>
                  <span class="text-foreground-success ml-1 font-medium">
                    {data.points === null ? '+n/a' : `+${data.points.toLocaleString()}`} pts
                  </span>
                  <span class="text-foreground-l4 mx-1">=</span>
                  <span class="text-foreground-l1">{data.score.toLocaleString()} pts</span>
                </div>
              {:else}
              <div class="flex items-center gap-2">
                <div class="size-2.5 rounded-sm" style="background-color: {data.color}"></div>
                <span class="max-w-48 truncate wrap-anywhere">{data.teamName}</span>
              </div>
              <div class="border-border/50 mt-2 border-t pt-2">
                <div class="text-foreground-l4 text-[10px]">Total score</div>
                <div class="text-foreground-l1 tabular-nums">
                  {data.score.toLocaleString()} pts
                </div>
              </div>
            {/if}
          </div>
        {/snippet}
      </Tooltip.Root>
    {/snippet}
  </ChartCore>
</ChartContainer>
