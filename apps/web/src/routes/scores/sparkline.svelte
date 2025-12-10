<script lang="ts">
  import { Layer, Chart as LayerChart, Spline } from 'layerchart'
  import { MEDAL_COLORS, PAGE_SIZE, RANK_COLORS, SELF_COLOR } from './constants'

  interface Props {
    data: { time: number; score: number }[]
    rank: number
    isCurrentUser: boolean
    page?: number
    onHover?: () => void
    onUnhover?: () => void
  }

  let { data, rank, isCurrentUser, page = 1, onHover, onUnhover }: Props = $props()

  const gradientId = $derived(`sparkline-gradient-${rank}-${page}`)

  const strokeColor = $derived.by(() => {
    if (isCurrentUser) return SELF_COLOR

    const indexInPage = (rank - 1) % PAGE_SIZE
    const isFirstPage = page === 1

    if (isFirstPage && indexInPage < 3) {
      return MEDAL_COLORS[indexInPage]!
    }

    return RANK_COLORS[indexInPage]!
  })
</script>

{#if data.length > 1}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="group/sparkline h-10 w-24" onmouseenter={onHover} onmouseleave={onUnhover}>
    <LayerChart
      {data}
      x="time"
      y="score"
      yDomain={null}
      padding={{ top: 4, bottom: 4, left: 2, right: 2 }}
    >
      <Layer type="svg">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color={strokeColor} stop-opacity="0" />
            <stop offset="100%" stop-color={strokeColor} stop-opacity="1" />
          </linearGradient>
        </defs>
        <Spline
          class="fill-none stroke-2 transition-[stroke-width] group-hover/sparkline:stroke-4"
          stroke="url(#{gradientId})"
          style="stroke-linecap: round; stroke-linejoin: round;"
        />
      </Layer>
    </LayerChart>
  </div>
{:else}
  <div class="flex h-10 w-24 items-center justify-center">
    <div class="bg-linear-to-r from-transparent to-foreground-l5/20 h-0.5 w-full rounded-full"></div>
  </div>
{/if}
