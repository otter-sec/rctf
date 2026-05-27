<script lang="ts">
  import type { ClientConfig, LeaderboardGraphEntry } from '@rctf/types'
  import ChartContainer from '$lib/components/ui/chart/chart-container.svelte'
  import { X_AXIS_DIVISIONS } from '$lib/constants/scores'
  import { formatLocalTime, formatRelativeHours, formatRelativeHoursMinutes } from '$lib/utils/time'
  import { Axis, ChartCore, Highlight, Svg, Text, Tooltip } from 'layerchart/svg'
  import {
    getProfileCategoryDisplay,
    type ProfileDynamicScore,
    type ProfileCategoryDisplay,
    type ProfileSolve,
  } from './profile-analytics-data'
  import { axisTicks, compactNumber, integerTicks, tickTextAnchor } from './profile-chart-utils'
  import ProfileSolveTooltip from './profile-solve-tooltip.svelte'

  type SampleScorePoint = {
    kind: 'sample'
    key: string
    time: number
    score: number
    color: string
  }

  type DynamicScorePoint = {
    kind: 'dynamic'
    key: string
    time: number
    score: number
    staticScore: number
    totalScore: number
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

  type ScorePoint = SampleScorePoint | DynamicScorePoint | SolveScorePoint

  type ScoreLinePoint = {
    time: number
    score: number
  }

  type Scale = (value: number) => number

  const domainPadding = 30 * 60 * 1000
  const totalLineColor = 'var(--foreground-l1)'
  const staticLineColor = 'var(--foreground-l3)'
  const dynamicLineColor = 'var(--foreground-l5)'

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
    if (points.length === 0) return undefined

    let minTime = Infinity
    let maxTime = -Infinity
    for (const point of points) {
      if (point.time < minTime) minTime = point.time
      if (point.time > maxTime) maxTime = point.time
    }

    const min = startTime > 0 ? startTime : minTime
    const max = minTime === maxTime ? maxTime + domainPadding : maxTime
    return [min, Math.min(endTime, max)]
  }

  function chartScoreMax(points: ScoreLinePoint[]): number {
    let maxScore = 1
    for (const point of points) {
      if (point.score > maxScore) maxScore = point.score
    }
    return maxScore
  }

  function scoreAt(time: number, points: ScoreLinePoint[]): number {
    let score = 0
    for (const point of points) {
      if (point.time > time) break
      score = point.score
    }
    return score
  }

  function exactScoreAt(time: number, points: ScoreLinePoint[]): number | null {
    for (const point of points) {
      if (point.time === time) return point.score
      if (point.time > time) break
    }
    return null
  }

  function buildDynamicPoints(
    points: ScoreLinePoint[],
    totalPoints: ScoreLinePoint[]
  ): DynamicScorePoint[] {
    return points.map(point => {
      const totalScore = scoreAt(point.time, totalPoints)
      return {
        kind: 'dynamic',
        key: `dynamic-${point.time}`,
        time: point.time,
        score: point.score,
        staticScore: Math.max(totalScore - point.score, 0),
        totalScore,
        color: dynamicLineColor,
      }
    })
  }

  interface Props {
    class?: string
    graphData: LeaderboardGraphEntry
    clientConfig: ClientConfig
    solves?: ProfileSolve[]
    dynamicScores?: ProfileDynamicScore[]
    splitDynamicScore?: boolean
  }

  let {
    class: className = '',
    graphData,
    clientConfig,
    solves = [],
    dynamicScores = [],
    splitDynamicScore = false,
  }: Props = $props()

  const sampledPoints = $derived<SampleScorePoint[]>(
    graphData.points.toReversed().map(p => ({
      kind: 'sample',
      key: `sample-${p.time}`,
      time: p.time,
      score: p.score,
      color: totalLineColor,
    }))
  )

  const sampledLinePoints = $derived<ScoreLinePoint[]>(
    sampledPoints.map(point => ({ time: point.time, score: point.score }))
  )
  const dynamicHistoryLinePoints = $derived<ScoreLinePoint[]>(
    (graphData.dynamicPoints ?? [])
      .toReversed()
      .map(point => ({ time: point.time, score: point.score }))
  )
  const currentDynamicScore = $derived(
    dynamicScores.reduce((sum, score) => sum + score.points, 0)
  )
  const dynamicLinePoints = $derived<ScoreLinePoint[]>(
    !splitDynamicScore
      ? []
      : dynamicHistoryLinePoints.length > 0
        ? dynamicHistoryLinePoints
        : currentDynamicScore > 0
          ? sampledPoints.map(point => ({
              time: point.time,
              score: currentDynamicScore,
            }))
          : []
  )
  const dynamicPoints = $derived<DynamicScorePoint[]>(
    splitDynamicScore
      ? buildDynamicPoints(dynamicLinePoints, sampledLinePoints)
      : []
  )
  const staticLinePoints = $derived<ScoreLinePoint[]>(
    splitDynamicScore
      ? sampledPoints.map(point => ({
          time: point.time,
          score: Math.max(
            point.score - scoreAt(point.time, dynamicLinePoints),
            0
          ),
        }))
      : []
  )
  const solvePoints = $derived.by<SolveScorePoint[]>(() => {
    let runningScore = 0

    return solves.map(solve => {
      const points = solve.awardedPoints ?? solve.points
      const category = getProfileCategoryDisplay(solve.category)
      const exactScore = exactScoreAt(solve.createdAt, staticLinePoints)
      const scoreBefore =
        splitDynamicScore && staticLinePoints.length > 0
          ? exactScore !== null && points !== null
            ? Math.max(exactScore - points, 0)
            : scoreAt(solve.createdAt, staticLinePoints)
          : runningScore
      const score = scoreBefore + (points ?? 0)

      runningScore = score

      return {
        kind: 'solve',
        key: `solve-${solve.id}`,
        challengeName: solve.name,
        categoryKey: category.key,
        categoryIcon: category.icon,
        time: solve.createdAt,
        score,
        scoreBefore,
        points,
        color: category.color,
        style: category.style,
      }
    })
  })
  const solveLinePoints = $derived<ScoreLinePoint[]>(
    solvePoints.map(point => ({ time: point.time, score: point.score }))
  )
  const hasStaticLine = $derived(
    splitDynamicScore && staticLinePoints.length > 1
  )
  const hasDynamicLine = $derived(
    splitDynamicScore &&
      dynamicLinePoints.length > 1 &&
      dynamicLinePoints.some(point => point.score > 0)
  )
  const hasSampledLine = $derived(sampledLinePoints.length > 1)
  const domainPoints = $derived.by<ScoreLinePoint[]>(() => {
    const points = [
      ...(hasSampledLine ? sampledLinePoints : []),
      ...(hasStaticLine ? staticLinePoints : []),
      ...(hasDynamicLine ? dynamicLinePoints : []),
      ...solveLinePoints,
    ]

    return points.length > 0 ? points : sampledLinePoints
  })
  const xDomain = $derived(
    chartTimeDomain(domainPoints, clientConfig.startTime, clientConfig.endTime)
  )
  const yMax = $derived(chartScoreMax(domainPoints))
  const chartPoints = $derived<ScorePoint[]>(
    [
      ...sampledPoints,
      ...(hasDynamicLine ? dynamicPoints : []),
      ...solvePoints,
    ]
  )

  const useMinutesFormat = $derived.by(() => {
    if (domainPoints.length === 0) return false
    let minTime = Infinity
    let maxTime = -Infinity
    for (const point of domainPoints) {
      if (point.time < minTime) minTime = point.time
      if (point.time > maxTime) maxTime = point.time
    }
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

        {#if hasDynamicLine}
          <path
            d={buildLinePath(dynamicLinePoints, context.xScale, context.yScale)}
            fill="none"
            stroke={dynamicLineColor}
            stroke-width={1.75}
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-dasharray="4 4"
            class="pointer-events-none"
          />
        {/if}

        {#if hasStaticLine}
          <path
            d={buildLinePath(staticLinePoints, context.xScale, context.yScale)}
            fill="none"
            stroke={staticLineColor}
            stroke-width={1.75}
            stroke-linecap="round"
            stroke-linejoin="round"
            class="pointer-events-none"
          />
        {/if}

        {#if hasSampledLine}
          <path
            d={buildLinePath(sampledLinePoints, context.xScale, context.yScale)}
            fill="none"
            stroke={totalLineColor}
            stroke-width={2.25}
            stroke-linecap="round"
            stroke-linejoin="round"
            class="pointer-events-none"
          />
        {/if}

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
          {:else if data.kind === 'dynamic'}
            <div
              class="border-background-l5 bg-background-l3 z-50 rounded-lg border-2 px-3 py-2 text-xs shadow-xl"
            >
              <div class="text-foreground-l3 mb-1.5">
                <div>{formatRelativeHoursMinutes(data.time, clientConfig.startTime)}</div>
                <div class="text-[10px]">{formatLocalTime(data.time)}</div>
              </div>
              <div class="grid grid-cols-2 gap-x-3 gap-y-1">
                <div class="text-foreground-l4 text-[10px]">Dynamic</div>
                <div class="text-foreground-l1 text-right tabular-nums">
                  {data.score.toLocaleString()} pts
                </div>
                <div class="text-foreground-l4 text-[10px]">Flag solves</div>
                <div class="text-foreground-l1 text-right tabular-nums">
                  {data.staticScore.toLocaleString()} pts
                </div>
                <div class="text-foreground-l4 text-[10px]">Total</div>
                <div class="text-foreground-l1 text-right tabular-nums">
                  {data.totalScore.toLocaleString()} pts
                </div>
              </div>
            </div>
          {:else}
            <div
              class="border-background-l5 bg-background-l3 z-50 rounded-lg border-2 px-3 py-2 text-xs shadow-xl"
            >
              <div class="text-foreground-l3 mb-1.5">
                <div>{formatRelativeHoursMinutes(data.time, clientConfig.startTime)}</div>
                <div class="text-[10px]">{formatLocalTime(data.time)}</div>
              </div>
              <div class="text-foreground-l4 text-[10px]">Total score</div>
              <div class="text-foreground-l1 tabular-nums">
                {data.score.toLocaleString()} pts
              </div>
            </div>
          {/if}
        {/snippet}
      </Tooltip.Root>
    {/snippet}
  </ChartCore>
</ChartContainer>
