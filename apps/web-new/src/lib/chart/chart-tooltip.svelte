<!--
  Hover tooltip rendered as pure SVG so it can be positioned via the `transform`
  presentation attribute (no inline styles) and share the parent <svg>'s
  coordinate space. Each row shows a colour swatch, name, score, plus a shared
  relative + local time header. Placement flips to stay inside the plot.
-->
<script module lang="ts">
  export interface TooltipRow {
    role: string
    name: string
    score: number
    time: number
  }
</script>

<script lang="ts">
  import { clampBoxPosition, truncateLabel } from '$lib/chart/tooltip-position'
  import { formatLocalTime, formatRelativeHoursMinutes } from '$lib/utils/time'

  interface Props {
    /** Anchor point in px (the highlighted sample). */
    x: number
    y: number
    chartWidth: number
    chartHeight: number
    rows: TooltipRow[]
    startTime: number
  }

  let { x, y, chartWidth, chartHeight, rows, startTime }: Props = $props()

  const WIDTH = 184
  const PAD = 8
  const GAP = 12
  const RELATIVE_Y = PAD + 10
  const LOCAL_Y = RELATIVE_Y + 11
  const ROWS_TOP = LOCAL_Y + 8
  const ROW_H = 16
  const SWATCH = 8

  const height = $derived(ROWS_TOP + rows.length * ROW_H + PAD - 4)

  const box = $derived(
    clampBoxPosition(
      { x, y },
      { width: WIDTH, height },
      { width: chartWidth, height: chartHeight },
      GAP
    )
  )

  const headerTime = $derived(rows[0]?.time ?? startTime)
</script>

<g data-chart-tooltip transform="translate({box.x},{box.y})">
  <rect data-tt-box width={WIDTH} {height} rx="6" />
  <text data-tt-time x={PAD} y={RELATIVE_Y}
    >{formatRelativeHoursMinutes(headerTime, startTime)}</text
  >
  <text data-tt-local x={PAD} y={LOCAL_Y}>{formatLocalTime(headerTime)}</text>
  {#each rows as row, index (index)}
    {@const rowY = ROWS_TOP + index * ROW_H}
    <rect
      data-tt-swatch
      data-series-role={row.role}
      x={PAD}
      y={rowY}
      width={SWATCH}
      height={SWATCH}
      rx="2"
      fill="currentColor"
    />
    <text data-tt-name x={PAD + SWATCH + 6} y={rowY + SWATCH}>{truncateLabel(row.name)}</text>
    <text data-tt-score x={WIDTH - PAD} y={rowY + SWATCH} text-anchor="end">
      {row.score.toLocaleString()} pts
    </text>
  {/each}
</g>

<style>
  [data-chart-tooltip] {
    pointer-events: none;
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

  [data-tt-name] {
    font-size: 0.6875rem;
    fill: var(--foreground-l1);
  }

  [data-tt-score] {
    font-size: 0.6875rem;
    font-variant-numeric: tabular-nums;
    fill: var(--foreground-l2);
  }
</style>
