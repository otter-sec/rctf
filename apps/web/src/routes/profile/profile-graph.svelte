<script lang="ts">
  import type { ClientConfig, LeaderboardGraphEntry } from '@rctf/types'
  import ChartContainer from '$lib/components/ui/chart/chart-container.svelte'
  import { X_AXIS_DIVISIONS } from '$lib/constants/scores'
  import { formatLocalTime, formatRelativeHours, formatRelativeHoursMinutes } from '$lib/utils/time'
  import { Axis, ChartCore, Highlight, Svg, Text, Tooltip } from 'layerchart/svg'
  import {
    getProfileCategoryDisplay,
    type ProfileCategoryDisplay,
    type ProfileSolve,
  } from './profile-analytics-data'
  import { axisTicks, compactNumber, integerTicks, tickTextAnchor } from './profile-chart-utils'
  import ProfileSolveTooltip from './profile-solve-tooltip.svelte'

  type SampleScorePoint = {
    kind: 'sample'
    key: string
    teamName: string
    time: number
    score: number
    color: string
  }

  type SolveScorePoint = {
    kind: 'solve'
    key: string
    time: number
    score: number
    scoreBefore: number
    points: number | null
    challengeName: string
    categoryKey: string
    categoryIcon: ProfileCategoryDisplay['icon']
    color: string
    style: string
  }

  type ScorePoint = SampleScorePoint | SolveScorePoint

  type ScoreLinePoint = {
    time: number
    score: number
  }

  type Scale = (value: number) => number

  const domainPadding = 30 * 60 * 1000
  const scoreLineColor = 'var(--foreground-l2)'

  function buildStepPath(points: ScoreLinePoint[], xScale: Scale, yScale: Scale) {
    const [first, ...rest] = points
    if (!first) return ''

    let path = `M ${xScale(first.time)} ${yScale(first.score)}`
    for (const point of rest) {
      path += ` H ${xScale(point.time)} V ${yScale(point.score)}`
    }
    return path
  }

  function buildLinePath(points: ScoreLinePoint[], xScale: Scale, yScale: Scale) {
    const [first, ...rest] = points
    if (!first) return ''

    let path = `M ${xScale(first.time)} ${yScale(first.score)}`
    for (const point of rest) {
      path += ` L ${xScale(point.time)} ${yScale(point.score)}`
    }
    return path
  }

  function chartTimeDomain(
    points: ScoreLinePoint[],
    startTime: number,
    endTime: number
  ): [number, number] | undefined {
    const first = points[0]
    const last = points.at(-1)
    if (!first || !last) return undefined
    const min = startTime > 0 ? startTime : first.time

    if (first.time === last.time) {
      return [min, Math.min(endTime, first.time + domainPadding)]
    }
    return [min, Math.min(endTime, last.time)]
  }

  function chartScoreMax(points: ScoreLinePoint[]): number {
    return Math.max(1, ...points.map(point => point.score))
  }

  interface Props {
    class?: string
    graphData: LeaderboardGraphEntry
    clientConfig: ClientConfig
    solves?: ProfileSolve[]
  }

  let { class: className = '', graphData, clientConfig, solves = [] }: Props = $props()

  const sampledPoints = $derived<SampleScorePoint[]>(
    graphData.points
      .filter(p => p.time >= clientConfig.startTime && p.time <= clientConfig.endTime)
      .toSorted((a, b) => a.time - b.time)
      .map(p => ({
        kind: 'sample',
        key: `sample-${p.time}`,
        teamName: graphData.name,
        time: p.time,
        score: p.score,
        color: scoreLineColor,
      }))
  )

  const solvePoints = $derived.by<SolveScorePoint[]>(() => {
    let score = 0
    return solves
      .filter(
        solve =>
          solve.createdAt >= clientConfig.startTime && solve.createdAt <= clientConfig.endTime
      )
      .toSorted((a, b) => a.createdAt - b.createdAt)
      .map(solve => {
        const scoreBefore = score
        score += solve.points ?? 0
        const category = getProfileCategoryDisplay(solve.category)

        return {
          kind: 'solve',
          key: `solve-${solve.id}`,
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

  const chartPoints = $derived<ScorePoint[]>(solvePoints.length > 0 ? solvePoints : sampledPoints)
  const sampledLinePoints = $derived<ScoreLinePoint[]>(
    sampledPoints.map(point => ({ time: point.time, score: point.score }))
  )
  const scoreLinePoints = $derived.by<ScoreLinePoint[]>(() => {
    const [firstSolve] = solvePoints
    if (!firstSolve) return sampledLinePoints

    return [
      { time: firstSolve.time, score: 0 },
      ...solvePoints.map(point => ({ time: point.time, score: point.score })),
    ]
  })
  const domainPoints = $derived(
    solvePoints.length > 0 ? [...scoreLinePoints, ...sampledLinePoints] : scoreLinePoints
  )
  const xDomain = $derived(
    chartTimeDomain(
      domainPoints.toSorted((a, b) => a.time - b.time),
      clientConfig.startTime,
      clientConfig.endTime
    )
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

  const colorDomain = $derived(Array.from(new Set(chartPoints.map(point => point.color))))
</script>

<ChartContainer class={className}>
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
              ? formatRelativeHoursMinutes(d, clientConfig.startTime)
              : formatRelativeHours(d, clientConfig.startTime)}
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
        {#snippet children({ data }: { data: ScorePoint })}
          {#if data.kind === 'solve'}
            <ProfileSolveTooltip
              time={data.time}
              ctfStart={clientConfig.startTime}
              style={data.style}
              categoryIcon={data.categoryIcon}
              categoryKey={data.categoryKey}
              challengeName={data.challengeName}
              scoreBefore={data.scoreBefore}
              points={data.points}
              score={data.score}
            />
          {:else}
            <div
              class="border-background-l5 bg-background-l3 z-50 min-w-56 rounded-lg border-2 px-3 py-2 text-xs shadow-xl"
            >
              <div class="text-foreground-l3 mb-1.5">
                <div>{formatRelativeHoursMinutes(data.time, clientConfig.startTime)}</div>
                <div class="text-[10px]">{formatLocalTime(data.time)}</div>
              </div>
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
            </div>
          {/if}
        {/snippet}
      </Tooltip.Root>
    {/snippet}
  </ChartCore>
</ChartContainer>
