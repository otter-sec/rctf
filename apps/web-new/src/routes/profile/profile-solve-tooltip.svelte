<!--
  Solve hover card for the profile score graph. Rendered as pure SVG (positioned
  by the `transform` presentation attribute) so it lives in the graph's <svg>
  coordinate space, matching the chart-tooltip idiom. Shows the solve time,
  category icon + `cat / name`, and the `before + points = after` arithmetic.
  Category tokens come from `data-category-color` on the group.
-->
<script lang="ts">
  import type { CategoryColor, CategoryConfig } from '$lib/utils/categories'
  import { formatLocalTime, formatRelativeHoursMinutes } from '$lib/utils/time'

  interface Props {
    /** Anchor point in px (the hovered dot). */
    x: number
    y: number
    chartWidth: number
    chartHeight: number
    startTime: number
    time: number
    color: CategoryColor
    categoryIcon: CategoryConfig['icon']
    catShort: string
    name: string
    scoreBefore: number
    points: number | null
    score: number
  }

  let {
    x,
    y,
    chartWidth,
    chartHeight,
    startTime,
    time,
    color,
    categoryIcon: CategoryIcon,
    catShort,
    name,
    scoreBefore,
    points,
    score,
  }: Props = $props()

  const WIDTH = 220
  const HEIGHT = 92
  const PAD = 10
  const GAP = 12
  const ICON = 14
  const REL_Y = PAD + 10
  const LOCAL_Y = REL_Y + 12
  const CHAL_Y = LOCAL_Y + 22
  const SEP_Y = CHAL_Y + 12
  const MATH_Y = SEP_Y + 18
  const NAME_MAX = 22

  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

  const boxX = $derived(
    clamp(x > chartWidth / 2 ? x - WIDTH - GAP : x + GAP, 4, Math.max(4, chartWidth - WIDTH - 4))
  )
  const boxY = $derived(clamp(y - HEIGHT / 2, 4, Math.max(4, chartHeight - HEIGHT - 4)))

  const deltaLabel = $derived(points === null ? '+n/a' : `+${points.toLocaleString()}`)

  function truncate(value: string): string {
    return value.length > NAME_MAX ? `${value.slice(0, NAME_MAX - 1)}…` : value
  }
</script>

<g data-solve-tooltip data-category-color={color} transform="translate({boxX},{boxY})">
  <rect data-tt-box width={WIDTH} height={HEIGHT} rx="6" />
  <text data-tt-time x={PAD} y={REL_Y}>{formatRelativeHoursMinutes(time, startTime)}</text>
  <text data-tt-local x={PAD} y={LOCAL_Y}>{formatLocalTime(time)}</text>

  <CategoryIcon x={PAD} y={CHAL_Y - 12} width={ICON} height={ICON} />
  <text x={PAD + ICON + 6} y={CHAL_Y}>
    <tspan data-tt-cat>{catShort} /</tspan>
    <tspan data-tt-name dx="4">{truncate(name)}</tspan>
  </text>

  <line data-tt-sep x1={PAD} y1={SEP_Y} x2={WIDTH - PAD} y2={SEP_Y} />
  <text data-tt-math x={PAD} y={MATH_Y}>
    <tspan data-tt-num>{scoreBefore.toLocaleString()} pts</tspan>
    <tspan data-tt-delta dx="6">{deltaLabel} pts</tspan>
    <tspan data-tt-eq dx="6">=</tspan>
    <tspan data-tt-num dx="6">{score.toLocaleString()} pts</tspan>
  </text>
</g>

<style>
  [data-solve-tooltip] {
    pointer-events: none;
    color: var(--category-foreground-l1);
  }

  [data-tt-box] {
    fill: var(--background-l4);
    stroke: var(--background-l5);
    stroke-width: 1;
  }

  [data-tt-time] {
    font-size: 0.6875rem;
    fill: var(--foreground-l3);
  }

  [data-tt-local] {
    font-size: 0.5625rem;
    fill: var(--foreground-l3);
  }

  [data-tt-cat] {
    font-size: 0.6875rem;
    font-weight: 500;
    fill: var(--category-foreground-l1);
  }

  [data-tt-name] {
    font-size: 0.6875rem;
    fill: var(--category-foreground-l0);
  }

  [data-tt-sep] {
    stroke: var(--background-l5);
    stroke-width: 1;
  }

  [data-tt-math] {
    font-size: 0.6875rem;
    font-variant-numeric: tabular-nums;
  }

  [data-tt-num] {
    fill: var(--foreground-l1);
  }

  [data-tt-delta] {
    font-weight: 500;
    fill: var(--foreground-success);
  }

  [data-tt-eq] {
    fill: var(--foreground-l4);
  }
</style>
