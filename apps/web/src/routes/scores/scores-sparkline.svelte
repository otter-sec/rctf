<script lang="ts">
  interface Props {
    data: { time: number; score: number }[]
    id: string
    color: string
    onHover?: () => void
    onUnhover?: () => void
  }

  let { data, id, color, onHover, onUnhover }: Props = $props()

  const WIDTH = 96
  const HEIGHT = 40
  const PAD_X = 2
  const PAD_Y = 4

  const gradientId = $derived(`sparkline-gradient-${id}`)

  // NOTE(es3n1n): layerchart is too heavy so handrolled path generation it is
  const pathD = $derived.by(() => {
    if (data.length < 2) return ''

    let minT = data[0]!.time
    let maxT = minT
    let minS = data[0]!.score
    let maxS = minS

    for (let i = 1; i < data.length; i++) {
      const p = data[i]!
      if (p.time < minT) minT = p.time
      if (p.time > maxT) maxT = p.time
      if (p.score < minS) minS = p.score
      if (p.score > maxS) maxS = p.score
    }

    const tRange = maxT - minT || 1
    const sRange = maxS - minS || 1
    const innerW = WIDTH - PAD_X * 2
    const innerH = HEIGHT - PAD_Y * 2

    const pts: { x: number; y: number }[] = []
    for (let i = 0; i < data.length; i++) {
      const p = data[i]!
      pts.push({
        x: PAD_X + ((p.time - minT) / tRange) * innerW,
        y: PAD_Y + (1 - (p.score - minS) / sRange) * innerH,
      })
    }

    if (pts.length === 2) {
      return `M${pts[0]!.x},${pts[0]!.y}L${pts[1]!.x},${pts[1]!.y}`
    }

    const n = pts.length
    const dx: number[] = []
    const dy: number[] = []
    const m: number[] = []

    for (let i = 0; i < n - 1; i++) {
      dx.push(pts[i + 1]!.x - pts[i]!.x)
      dy.push(pts[i + 1]!.y - pts[i]!.y)
      m.push(dy[i]! / (dx[i]! || 1))
    }

    const tangents: number[] = [m[0]!]
    for (let i = 1; i < n - 1; i++) {
      if (m[i - 1]! * m[i]! <= 0) {
        tangents.push(0)
      } else {
        tangents.push(
          (3 * (dx[i - 1]! + dx[i]!)) /
            ((2 * dx[i]! + dx[i - 1]!) / m[i - 1]! + (dx[i]! + 2 * dx[i - 1]!) / m[i]!)
        )
      }
    }
    tangents.push(m[n - 2]!)

    let d = `M${pts[0]!.x},${pts[0]!.y}`
    for (let i = 0; i < n - 1; i++) {
      const seg = dx[i]! / 3
      d += `C${pts[i]!.x + seg},${pts[i]!.y + tangents[i]! * seg},${pts[i + 1]!.x - seg},${pts[i + 1]!.y - tangents[i + 1]! * seg},${pts[i + 1]!.x},${pts[i + 1]!.y}`
    }
    return d
  })
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<score-sparkline
  empty={data.length <= 1 || undefined}
  onmouseenter={onHover}
  onmouseleave={onUnhover}
>
  {#if data.length > 1}
    <svg viewBox="0 0 {WIDTH} {HEIGHT}" preserveAspectRatio="none">
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
  {:else}
    <div></div>
  {/if}
</score-sparkline>

<style>
  score-sparkline {
    display: block;
    width: 6rem;
    height: 2.5rem;

    svg {
      width: 100%;
      height: 100%;

      path {
        transition: stroke-width 150ms ease;
      }
    }

    &:hover path {
      stroke-width: 4;
    }

    &[empty] {
      display: flex;
      align-items: center;
      justify-content: center;

      div {
        width: 100%;
        height: 0.125rem;
        border-radius: 999px;
        background: linear-gradient(
          to right,
          transparent,
          color-mix(in oklab, var(--foreground-l5) 20%, transparent)
        );
      }
    }
  }
</style>
