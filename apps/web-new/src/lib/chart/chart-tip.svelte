<script lang="ts">
  import { clampBoxPosition } from '$lib/chart/tooltip-position'
  import { formatLocalTime, formatRelativeHoursMinutes } from '$lib/utils/time'
  import type { Snippet } from 'svelte'

  interface Props {
    x: number
    y: number
    chartWidth: number
    chartHeight: number
    time?: number
    startTime?: number
    wide?: boolean
    categoryColor?: string
    children: Snippet
  }

  let {
    x,
    y,
    chartWidth,
    chartHeight,
    time,
    startTime = 0,
    wide = false,
    categoryColor,
    children,
  }: Props = $props()

  let tipWidth = $state(0)
  let tipHeight = $state(0)

  const position = $derived(
    clampBoxPosition(
      { x, y },
      { width: tipWidth, height: tipHeight },
      { width: chartWidth, height: chartHeight },
      12
    )
  )
</script>

<chart-tip
  bind:clientWidth={tipWidth}
  bind:clientHeight={tipHeight}
  data-measured={tipWidth > 0 || undefined}
  data-wide={wide || undefined}
  data-category-color={categoryColor}
  style="--tip-x: {position.x}px; --tip-y: {position.y}px"
>
  {#if time !== undefined}
    <tip-time>
      <span>{formatRelativeHoursMinutes(time, startTime)}</span>
      <small>{formatLocalTime(time)}</small>
    </tip-time>
  {/if}
  {@render children()}
</chart-tip>

<style>
  chart-tip {
    position: absolute;
    inset-block-start: var(--tip-y);
    inset-inline-start: var(--tip-x);
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
    background: var(--background-l4);
    border: 2px solid var(--background-l5);
    border-radius: var(--radius-lg);
    box-shadow: 0 1.25rem 1.5rem -0.75rem rgb(0 0 0 / 40%);
    pointer-events: none;
    visibility: hidden;

    &[data-measured] {
      visibility: visible;
    }

    &[data-wide] {
      max-inline-size: 16rem;
    }
  }

  tip-time {
    display: flex;
    flex-direction: column;
    margin-block-end: var(--space-3xs);
    color: var(--foreground-l3);

    small {
      font-size: 0.625rem;
    }
  }
</style>
