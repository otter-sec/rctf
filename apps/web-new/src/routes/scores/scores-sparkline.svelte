<script lang="ts">
  import { monotoneCubicPath, type Point } from '$lib/chart/path'
  import type { GraphPoint } from './scores-transforms'

  interface Props {
    data: GraphPoint[]
    id: string
    color: string
  }

  let { data, id, color }: Props = $props()

  const WIDTH = 96
  const HEIGHT = 40
  const PAD_X = 2
  const PAD_Y = 4

  const gradientId = $derived(`spark-${id}`)

  // Anchor the window to the data's own extents, not Date.now(), so a stale
  // series keeps its shape instead of collapsing against the left edge.
  const pathD = $derived.by(() => {
    if (data.length < 2) return ''

    let minT = data[0]!.time
    let maxT = minT
    let minS = data[0]!.score
    let maxS = minS
    for (const point of data) {
      if (point.time < minT) minT = point.time
      if (point.time > maxT) maxT = point.time
      if (point.score < minS) minS = point.score
      if (point.score > maxS) maxS = point.score
    }

    const tRange = maxT - minT || 1
    const sRange = maxS - minS || 1
    const innerW = WIDTH - PAD_X * 2
    const innerH = HEIGHT - PAD_Y * 2

    const points: Point[] = data.map(point => ({
      x: PAD_X + ((point.time - minT) / tRange) * innerW,
      y: PAD_Y + (1 - (point.score - minS) / sRange) * innerH,
    }))
    return monotoneCubicPath(points)
  })
</script>

{#if pathD}
  <score-sparkline>
    <svg viewBox="0 0 {WIDTH} {HEIGHT}" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color={color} stop-opacity="0" />
          <stop offset="100%" stop-color={color} stop-opacity="1" />
        </linearGradient>
      </defs>
      <path
        d={pathD}
        fill="none"
        stroke="url(#{gradientId})"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />
    </svg>
  </score-sparkline>
{:else}
  <score-sparkline data-empty>
    <sparkline-placeholder></sparkline-placeholder>
  </score-sparkline>
{/if}

<style>
  score-sparkline {
    display: block;
    inline-size: 6rem;
    block-size: 2.5rem;

    svg {
      inline-size: 100%;
      block-size: 100%;

      path {
        transition: stroke-width 150ms ease;
      }
    }

    &:hover path {
      stroke-width: 4;
    }

    &[data-empty] {
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  sparkline-placeholder {
    display: block;
    inline-size: 100%;
    block-size: 0.125rem;
    background: linear-gradient(
      to right,
      transparent,
      color-mix(in oklab, var(--foreground-l5) 20%, transparent)
    );
    border-radius: var(--radius-full);
  }
</style>
