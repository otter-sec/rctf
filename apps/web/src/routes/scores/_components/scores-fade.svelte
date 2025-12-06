<script lang="ts">
  import { cn } from '$lib/utils'

  interface Props {
    teamColWidth: number
    headerHeight: number
    fadeSize: number
    bottomOffset?: number
    showTopFade: boolean
    showBottomFade: boolean
    showLeftFade: boolean
    showRightFade: boolean
    showSelfRow?: boolean
  }

  let {
    teamColWidth,
    headerHeight,
    fadeSize,
    bottomOffset = 0,
    showTopFade,
    showBottomFade,
    showLeftFade,
    showRightFade,
    showSelfRow = false,
  }: Props = $props()

  type Fade = {
    show: boolean
    class: string
    style: string
  }

  const fades = $derived<Fade[]>([
    {
      show: showLeftFade,
      class: 'top-0 bg-linear-to-r from-background-l0 to-transparent',
      style: `left:${teamColWidth}px;height:${headerHeight}px;width:${fadeSize}px`,
    },
    {
      show: showRightFade,
      class: 'right-0 top-0 bg-linear-to-l from-background-l0 to-transparent',
      style: `height:${headerHeight}px;width:${fadeSize}px`,
    },
    {
      show: showTopFade,
      class: 'left-0 bg-linear-to-b from-background-l0 to-transparent',
      style: `top:${headerHeight}px;width:${teamColWidth}px;height:${fadeSize}px`,
    },
    {
      show: showBottomFade,
      class: 'left-0 bg-linear-to-t from-background-l0 to-transparent',
      style: `bottom:${bottomOffset}px;width:${teamColWidth}px;height:${fadeSize}px`,
    },
    {
      show: showTopFade,
      class: 'right-0 bg-linear-to-b from-background-l0 to-transparent',
      style: `top:${headerHeight}px;left:${teamColWidth}px;height:${fadeSize}px`,
    },
    {
      show: showBottomFade,
      class: 'right-0 bg-linear-to-t from-background-l0 to-transparent',
      style: `bottom:${bottomOffset}px;left:${teamColWidth}px;height:${fadeSize}px`,
    },
    {
      show: showLeftFade,
      class: 'bg-linear-to-r from-background-l0 to-transparent',
      style: `bottom:${bottomOffset}px;left:${teamColWidth}px;top:${headerHeight}px;width:${fadeSize}px`,
    },
    {
      show: showRightFade,
      class: 'right-0 bg-linear-to-l from-background-l0 to-transparent',
      style: `bottom:${bottomOffset}px;top:${headerHeight}px;width:${fadeSize}px`,
    },
    {
      show: showLeftFade && showSelfRow,
      class: 'bg-linear-to-r from-background-l0 to-transparent',
      style: `bottom:0;left:${teamColWidth}px;height:${bottomOffset}px;width:${fadeSize}px`,
    },
    {
      show: showRightFade && showSelfRow,
      class: 'right-0 bg-linear-to-l from-background-l0 to-transparent',
      style: `bottom:0;height:${bottomOffset}px;width:${fadeSize}px`,
    },
  ])
</script>

{#each fades as fade}
  <div
    class={cn(
      'pointer-events-none absolute z-30',
      fade.class,
      fade.show ? 'opacity-100' : 'opacity-0'
    )}
    style={fade.style}
    aria-hidden="true">
  </div>
{/each}
