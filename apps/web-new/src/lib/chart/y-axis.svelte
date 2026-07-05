<!--
  Left value axis: faint horizontal gridlines with a numeric label tucked just
  above each line at the plot's left edge (so no extra left padding is needed).
  Geometry (px) is computed by the consumer; tick values come from
  `niceLinearTicks`. The zero line is left to the bottom axis rule. Meant to live
  inside a parent <svg>.
-->
<script lang="ts">
  import type { ScaleFn } from '$lib/chart/scale'

  interface Props {
    values: number[]
    scale: ScaleFn
    left: number
    right: number
  }

  let { values, scale, left, right }: Props = $props()

  const lines = $derived(values.filter(value => value > 0))
</script>

<g data-chart-y-axis>
  {#each lines as value (value)}
    {@const y = scale(value)}
    <line data-y-gridline x1={left} y1={y} x2={right} y2={y} />
    <text data-y-tick x={left} {y} dy={-3}>{value.toLocaleString()}</text>
  {/each}
</g>

<style>
  [data-y-gridline] {
    stroke: var(--foreground-l5);
    stroke-width: 1;
    opacity: 0.25;
  }

  [data-y-tick] {
    font-size: 0.625rem;
    font-variant-numeric: tabular-nums;
    fill: var(--foreground-l3);
    opacity: 0.75;
  }
</style>
