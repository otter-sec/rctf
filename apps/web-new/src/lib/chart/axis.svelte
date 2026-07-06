<script lang="ts">
  import type { ScaleFn } from '$lib/chart/scale'
  import type { Tick } from '$lib/chart/ticks'

  interface Props {
    ticks: Tick[]
    scale: ScaleFn
    y: number
    left: number
    right: number
  }

  let { ticks, scale, y, left, right }: Props = $props()

  function anchor(index: number): 'start' | 'middle' | 'end' {
    if (index === 0) return 'start'
    if (index === ticks.length - 1) return 'end'
    return 'middle'
  }
</script>

<g data-chart-axis>
  <line data-axis-rule x1={left} y1={y} x2={right} y2={y} />
  {#each ticks as tick, index (index)}
    <text data-axis-tick x={scale(tick.value)} {y} dy={16} text-anchor={anchor(index)}>
      {tick.label}
    </text>
  {/each}
</g>

<style>
  [data-axis-rule] {
    stroke: var(--foreground-l5);
    stroke-width: 1;
  }

  [data-axis-tick] {
    font-size: 0.6875rem;
    font-variant-numeric: tabular-nums;
    fill: var(--foreground-l3);
  }
</style>
