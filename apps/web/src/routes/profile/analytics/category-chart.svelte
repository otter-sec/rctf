<script lang="ts">
  import ChartTip from '$lib/chart/chart-tip.svelte'
  import { createHoverTip } from '$lib/chart/hover-tip.svelte'
  import { createLinearScale } from '$lib/chart/scale'
  import { niceLinearTicks } from '$lib/chart/y-ticks'
  import { IconCheck } from '$lib/icons'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import {
    maxChartValue,
    type CategoryBarDatum,
    type CategoryBarSegment,
  } from './analytics-data'
  import { earnedSegmentEnd, separatorIsNeutral } from './chart-geometry'
  import { compactNumber } from './chart-utils'

  interface Props {
    data: CategoryBarDatum[]
    emptyMessage: string
  }

  let { data, emptyMessage }: Props = $props()

  const ROW_H = 28
  const PAD_TOP = 4
  const PAD_BOTTOM = 24
  const PAD_LEFT = 76
  const PAD_RIGHT = 8
  const ROW_INSET = 2
  const GRADIENT_MAX = 140

  const componentId = $props.id()
  const uid = componentId.replace(/[^a-zA-Z0-9_-]/g, '-')

  let width = $state(0)
  const hover = createHoverTip('data-seg-hit', 'segKey')

  const height = $derived(data.length * ROW_H + PAD_TOP + PAD_BOTTOM)
  const innerRight = $derived(Math.max(PAD_LEFT, width - PAD_RIGHT))
  const innerBottom = $derived(PAD_TOP + data.length * ROW_H)

  const chartMax = $derived(maxChartValue(data, item => item.max))
  const xScale = $derived(
    createLinearScale([0, chartMax], [PAD_LEFT, innerRight])
  )
  const xTicks = $derived(niceLinearTicks(chartMax, 4))

  type HitEntry = { item: CategoryBarDatum; segment: CategoryBarSegment | null }

  const hitByKey = $derived.by(() => {
    const map = new Map<string, HitEntry>()
    for (const item of data) {
      if (item.segments && item.segments.length > 0) {
        for (const segment of item.segments) {
          map.set(`${item.key}:${segment.key}`, { item, segment })
        }
      } else {
        map.set(item.key, { item, segment: null })
      }
    }
    return map
  })

  const active = $derived(
    hover.activeKey === null ? null : (hitByKey.get(hover.activeKey) ?? null)
  )

  function rowY(index: number): number {
    return PAD_TOP + index * ROW_H + ROW_INSET
  }

  const barHeight = ROW_H - ROW_INSET * 2

  function segmentKind(
    segment: CategoryBarSegment
  ): 'solved' | 'dynamic' | 'unsolved' {
    if (segment.muted) return 'unsolved'
    if (segment.hatched) return 'dynamic'
    return 'solved'
  }
</script>

{#if data.length > 0}
  <category-root style="--chart-height: {height}px">
    <div data-viewport bind:clientWidth={width}>
      <svg
        role="img"
        aria-label="Points by category"
        {width}
        {height}
        onpointermove={hover.handleMove}
        onpointerleave={hover.handleLeave}
      >
        {#each xTicks.values as value (value)}
          {@const gx = xScale(value)}
          <line data-x-grid x1={gx} y1={PAD_TOP} x2={gx} y2={innerBottom} />
          <text
            data-x-label
            x={gx}
            y={innerBottom}
            dy={16}
            text-anchor="middle"
          >
            {compactNumber(value)}
          </text>
        {/each}

        {#each data as item, index (item.key)}
          {@const y = rowY(index)}
          {@const x0 = PAD_LEFT}
          {@const trackWidth = Math.max(0, xScale(item.max) - x0)}
          {@const itemWidth = Math.max(0, xScale(item.value) - x0)}
          {@const clipId = `cat-clip-${uid}-${index}`}
          {@const hatchId = `cat-hatch-${uid}-${index}`}
          {@const gradientId = `cat-grad-${uid}-${index}`}
          {@const hasHatch = (item.segments ?? []).some(
            segment => segment.hatched
          )}
          <rect
            data-track
            x={x0}
            {y}
            width={trackWidth}
            height={barHeight}
            rx="4"
          />

          {#if item.segments && item.segments.length > 0}
            {@const earnedEnd = earnedSegmentEnd(item.segments)}
            {@const earnedWidth = Math.max(0, xScale(earnedEnd) - x0)}
            <g data-category-color={item.color}>
              <defs>
                <clipPath id={clipId}>
                  <rect
                    x={x0}
                    {y}
                    width={itemWidth}
                    height={barHeight}
                    rx="4"
                  />
                </clipPath>
                {#if hasHatch}
                  <pattern
                    id={hatchId}
                    width="6"
                    height="6"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(45)"
                  >
                    <line data-hatch-line x1="0" y1="0" x2="0" y2="6" />
                  </pattern>
                {/if}
              </defs>

              <g clip-path="url(#{clipId})">
                {#each item.segments as segment (segment.key)}
                  {@const sx = xScale(segment.start)}
                  {@const sw = Math.max(0, xScale(segment.end) - sx)}
                  {@const key = `${item.key}:${segment.key}`}
                  {@const kind = segmentKind(segment)}
                  <rect
                    data-segment
                    data-kind={kind}
                    x={sx}
                    {y}
                    width={sw}
                    height={barHeight}
                  />
                  {#if segment.hatched}
                    <rect
                      x={sx}
                      {y}
                      width={sw}
                      height={barHeight}
                      fill="url(#{hatchId})"
                    />
                  {/if}
                  {#if hover.activeKey === key}
                    <rect
                      data-seg-active
                      data-kind={kind}
                      x={sx}
                      {y}
                      width={sw}
                      height={barHeight}
                    />
                  {/if}
                {/each}

                {#each item.segments as segment, segmentIndex (segment.key)}
                  {#if segment.end < item.value}
                    {@const lineX = xScale(segment.end)}
                    <line
                      data-sep
                      data-neutral={separatorIsNeutral(
                        item.segments,
                        segmentIndex
                      ) || undefined}
                      x1={lineX}
                      x2={lineX}
                      y1={y}
                      y2={y + barHeight}
                    />
                  {/if}
                  {#if segment.hatched && segment.start > 0}
                    {@const lineX = xScale(segment.start)}
                    <line
                      data-sep
                      x1={lineX}
                      x2={lineX}
                      y1={y}
                      y2={y + barHeight}
                    />
                  {/if}
                {/each}
              </g>

              <rect
                data-track-outline
                x={x0}
                {y}
                width={itemWidth}
                height={barHeight}
                rx="4"
              />
              {#if earnedWidth > 0}
                <rect
                  data-earned-outline
                  x={x0}
                  {y}
                  width={earnedWidth}
                  height={barHeight}
                  rx="4"
                />
              {/if}
            </g>
          {:else}
            <g data-category-color={item.color}>
              <rect
                data-solid-bar
                x={x0}
                {y}
                width={itemWidth}
                height={barHeight}
                rx="4"
              />
            </g>
          {/if}

          {#if item.fullClear}
            {@const clearWidth = Math.max(
              0,
              xScale(item.fullClearValue ?? item.value) - x0
            )}
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" data-grad-start />
                <stop offset="100%" data-grad-end />
              </linearGradient>
            </defs>
            <rect
              data-full-wash
              x={x0}
              {y}
              width={Math.min(GRADIENT_MAX, clearWidth)}
              height={barHeight}
              fill="url(#{gradientId})"
              rx="4"
            />
            <g data-full-check>
              <IconCheck
                x={x0 + 7}
                y={y + barHeight / 2 - 7}
                width="14"
                height="14"
              />
            </g>
          {/if}

          <text
            data-row-label
            x={x0 - 10}
            y={y + barHeight / 2}
            dy={3}
            text-anchor="end"
          >
            {item.label}
          </text>

          {#if item.segments && item.segments.length > 0}
            {#each item.segments as segment (segment.key)}
              {@const sx = xScale(segment.start)}
              {@const sw = Math.max(0, xScale(segment.end) - sx)}
              {#if sw > 0}
                <rect
                  data-seg-hit
                  data-seg-key={`${item.key}:${segment.key}`}
                  aria-label={segment.label}
                  x={sx}
                  {y}
                  width={sw}
                  height={barHeight}
                />
              {/if}
            {/each}
          {:else if itemWidth > 0}
            <rect
              data-seg-hit
              data-seg-key={item.key}
              x={x0}
              {y}
              width={itemWidth}
              height={barHeight}
            />
          {/if}
        {/each}

        <line
          data-axis-rule
          x1={PAD_LEFT}
          y1={innerBottom}
          x2={innerRight}
          y2={innerBottom}
        />
      </svg>
    </div>

    {#if active && hover.tip}
      {@const Icon = active.item.icon}
      <ChartTip
        x={hover.tip.x}
        y={hover.tip.y}
        chartWidth={width}
        chartHeight={height}
        wide
        categoryColor={active.item.color}
      >
        <tip-heading>
          <Icon width="16" height="16" />
          {#if active.segment}
            <span data-cat>{active.item.label} /</span>
            <span data-name>{active.segment.label}</span>
          {:else}
            <span data-cat>{active.item.tooltipLabel}</span>
          {/if}
        </tip-heading>
        <span data-detail>
          {#if active.segment}
            {active.segment.detail ??
              `${active.segment.value.toLocaleString()} pts`}
          {:else}
            {active.item.detail}
          {/if}
        </span>
      </ChartTip>
    {/if}
  </category-root>
{:else}
  <EmptyState title={emptyMessage} />
{/if}

<style>
  category-root {
    position: relative;
    display: block;
    inline-size: 100%;
    block-size: var(--chart-height);
  }

  [data-viewport] {
    inline-size: 100%;
    block-size: 100%;
  }

  svg {
    display: block;
    inline-size: 100%;
    block-size: 100%;
  }

  [data-x-grid] {
    stroke: var(--foreground-l5);
    stroke-width: 1;
    opacity: 0.25;
  }

  [data-x-label] {
    font-size: 0.6875rem;
    font-variant-numeric: tabular-nums;
    fill: var(--foreground-l3);
  }

  [data-row-label] {
    font-size: 0.6875rem;
    fill: var(--foreground-l3);
  }

  [data-axis-rule] {
    stroke: var(--foreground-l5);
    stroke-width: 1;
  }

  [data-track] {
    fill: var(--background-l4);
  }

  [data-segment][data-kind='solved'],
  [data-segment][data-kind='dynamic'] {
    fill: var(--category-background-l0);
  }

  [data-segment][data-kind='unsolved'] {
    fill: var(--background-l4);
  }

  [data-hatch-line] {
    stroke: var(--category-foreground-l1);
    stroke-opacity: 0.45;
    stroke-width: 2;
  }

  [data-seg-active] {
    fill: var(--category-foreground-l1);
    fill-opacity: 0.25;

    &[data-kind='unsolved'] {
      fill: var(--foreground-l5);
      fill-opacity: 0.12;
    }
  }

  [data-sep] {
    stroke: var(--category-foreground-l1);
    stroke-opacity: 0.45;
    stroke-width: 1;

    &[data-neutral] {
      stroke: var(--foreground-l5);
      stroke-opacity: 0.28;
    }
  }

  [data-track-outline] {
    fill: none;
    stroke: var(--foreground-l5);
    stroke-opacity: 0.22;
    stroke-width: 1.5;
  }

  [data-earned-outline] {
    fill: none;
    stroke: var(--category-foreground-l1);
    stroke-opacity: 0.75;
    stroke-width: 1.5;
  }

  [data-solid-bar] {
    fill: var(--category-background-l0);
    stroke: var(--category-foreground-l1);
    stroke-opacity: 0.75;
    stroke-width: 1.5;
  }

  [data-grad-start] {
    stop-color: var(--foreground-success);
    stop-opacity: 0.22;
  }

  [data-grad-end] {
    stop-color: var(--foreground-success);
    stop-opacity: 0;
  }

  [data-full-wash] {
    pointer-events: none;
  }

  [data-full-check] {
    color: var(--foreground-success);
    pointer-events: none;
  }

  [data-seg-hit] {
    fill: transparent;
  }

  tip-heading {
    display: flex;
    align-items: center;
    gap: var(--space-3xs);
    min-inline-size: 0;
    color: var(--category-foreground-l1);

    :global(svg) {
      flex-shrink: 0;
    }
  }

  [data-cat] {
    flex-shrink: 0;
    font-weight: 500;
  }

  [data-name] {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--category-foreground-l0);
  }

  [data-detail] {
    font-variant-numeric: tabular-nums;
    color: var(--foreground-l3);
  }
</style>
