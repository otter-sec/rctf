<script lang="ts">
  import { cn } from '$lib/utils'

  interface Props {
    teamColWidth: number
    headerHeight: number
    fadeSize: number
    showTopFade: boolean
    showBottomFade: boolean
    showLeftFade: boolean
    showRightFade: boolean
  }

  let {
    teamColWidth,
    headerHeight,
    fadeSize,
    showTopFade,
    showBottomFade,
    showLeftFade,
    showRightFade,
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
      class: 'bottom-0 left-0 bg-linear-to-t from-background-l0 to-transparent',
      style: `width:${teamColWidth}px;height:${fadeSize}px`,
    },
    {
      show: showTopFade,
      class: 'right-0 bg-linear-to-b from-background-l0 to-transparent',
      style: `top:${headerHeight}px;left:${teamColWidth}px;height:${fadeSize}px`,
    },
    {
      show: showBottomFade,
      class:
        'right-0 bottom-0 bg-linear-to-t from-background-l0 to-transparent',
      style: `left:${teamColWidth}px;height:${fadeSize}px`,
    },
    {
      show: showLeftFade,
      class: 'bottom-0 bg-linear-to-r from-background-l0 to-transparent',
      style: `left:${teamColWidth}px;top:${headerHeight}px;width:${fadeSize}px`,
    },
    {
      show: showRightFade,
      class:
        'right-0 bottom-0 bg-linear-to-l from-background-l0 to-transparent',
      style: `top:${headerHeight}px;width:${fadeSize}px`,
    },
  ])
</script>

{#each fades as fade}
  <div
    class={cn(
      'pointer-events-none absolute z-40 transition-opacity',
      fade.class,
      fade.show ? 'opacity-100' : 'opacity-0'
    )}
    style={fade.style}
    aria-hidden="true"
  ></div>
{/each}
