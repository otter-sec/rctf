<script lang="ts">
  interface Props {
    x: number
    y: number
    top: number
    bottom: number
    left: number
    right: number
  }

  let { x, y, top, bottom, left, right }: Props = $props()
</script>

<g data-chart-crosshair>
  <line data-crosshair-line x1={x} y1={top} x2={x} y2={bottom} />
  <line data-crosshair-line x1={left} y1={y} x2={right} y2={y} />
  <circle data-crosshair-dot cx={x} cy={y} r="5" fill="currentColor" />
</g>

<style>
  [data-chart-crosshair] {
    pointer-events: none;
  }

  [data-crosshair-line] {
    stroke: currentColor;
    stroke-width: 1;
    stroke-dasharray: 4 4;
    opacity: 0.5;
  }

  [data-crosshair-dot] {
    stroke: var(--background-l1);
    stroke-width: 3;
  }
</style>
