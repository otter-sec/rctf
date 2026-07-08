<script module lang="ts">
  export interface TooltipRow {
    role: string
    name: string
    score: number
    time: number
  }
</script>

<script lang="ts">
  import ChartTip from '$lib/chart/chart-tip.svelte'

  interface Props {
    x: number
    y: number
    chartWidth: number
    chartHeight: number
    rows: TooltipRow[]
    startTime: number
  }

  let { x, y, chartWidth, chartHeight, rows, startTime }: Props = $props()

  const headerTime = $derived(rows[0]?.time ?? startTime)
</script>

<ChartTip {x} {y} {chartWidth} {chartHeight} time={headerTime} {startTime}>
  {#each rows as row, index (index)}
    <tooltip-row>
      <color-swatch data-series-role={row.role}></color-swatch>
      <span>{row.name}</span>
      <strong>{row.score.toLocaleString()} pts</strong>
    </tooltip-row>
  {/each}
</ChartTip>

<style>
  tooltip-row {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
  }

  color-swatch {
    flex-shrink: 0;
    inline-size: 0.625rem;
    block-size: 0.625rem;
    background: currentColor;
    border-radius: var(--radius-xs);
  }

  span {
    max-inline-size: 12rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    margin-inline-start: auto;
    padding-inline-start: var(--space-xs);
    color: var(--foreground-l3);
    font-weight: var(--font-weight-normal);
    font-variant-numeric: tabular-nums;
  }
</style>
