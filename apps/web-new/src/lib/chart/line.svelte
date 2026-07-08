<script lang="ts">
  import { monotoneCubicPath, type Point } from '$lib/chart/path'

  interface Props {
    points: Point[]
    color?: string
    width?: number
    opacity?: number
  }

  let { points, color = 'currentColor', width = 2, opacity = 1 }: Props = $props()

  const d = $derived(monotoneCubicPath(points))
</script>

{#if d}
  <path data-chart-line {d} stroke={color} stroke-width={width} {opacity} />
{/if}

<style>
  [data-chart-line] {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition:
      opacity 150ms ease,
      stroke 150ms ease;
  }
</style>
