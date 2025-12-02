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

  const baseFadeClass = 'pointer-events-none absolute z-40 transition-opacity'
</script>

<div
  class={cn(
    baseFadeClass,
    'top-0 bg-linear-to-r from-background-l0 to-transparent',
    showLeftFade ? 'opacity-100' : 'opacity-0'
  )}
  style:left="{teamColWidth}px"
  style:height="{headerHeight}px"
  style:width="{fadeSize}px"
  aria-hidden="true"
></div>
<div
  class={cn(
    baseFadeClass,
    'right-0 top-0 bg-linear-to-l from-background-l0 to-transparent',
    showRightFade ? 'opacity-100' : 'opacity-0'
  )}
  style:height="{headerHeight}px"
  style:width="{fadeSize}px"
  aria-hidden="true"
></div>

<div
  class={cn(
    baseFadeClass,
    'left-0 bg-linear-to-b from-background-l0 to-transparent',
    showTopFade ? 'opacity-100' : 'opacity-0'
  )}
  style:top="{headerHeight}px"
  style:width="{teamColWidth}px"
  style:height="{fadeSize}px"
  aria-hidden="true"
></div>
<div
  class={cn(
    baseFadeClass,
    'bottom-0 left-0 bg-linear-to-t from-background-l0 to-transparent',
    showBottomFade ? 'opacity-100' : 'opacity-0'
  )}
  style:width="{teamColWidth}px"
  style:height="{fadeSize}px"
  aria-hidden="true"
></div>

<div
  class={cn(
    baseFadeClass,
    'right-0 bg-linear-to-b from-background-l0 to-transparent',
    showTopFade ? 'opacity-100' : 'opacity-0'
  )}
  style:top="{headerHeight}px"
  style:left="{teamColWidth}px"
  style:height="{fadeSize}px"
  aria-hidden="true"
></div>
<div
  class={cn(
    baseFadeClass,
    'right-0 bottom-0 bg-linear-to-t from-background-l0 to-transparent',
    showBottomFade ? 'opacity-100' : 'opacity-0'
  )}
  style:left="{teamColWidth}px"
  style:height="{fadeSize}px"
  aria-hidden="true"
></div>

<div
  class={cn(
    baseFadeClass,
    'bottom-0 bg-linear-to-r from-background-l0 to-transparent',
    showLeftFade ? 'opacity-100' : 'opacity-0'
  )}
  style:left="{teamColWidth}px"
  style:top="{headerHeight}px"
  style:width="{fadeSize}px"
  aria-hidden="true"
></div>
<div
  class={cn(
    baseFadeClass,
    'right-0 bottom-0 bg-linear-to-l from-background-l0 to-transparent',
    showRightFade ? 'opacity-100' : 'opacity-0'
  )}
  style:top="{headerHeight}px"
  style:width="{fadeSize}px"
  aria-hidden="true"
></div>
