<script lang="ts">
  import ChartTip from '$lib/chart/chart-tip.svelte'
  import type { CategoryColor, CategoryConfig } from '$lib/utils/categories'

  interface Props {
    x: number
    y: number
    chartWidth: number
    chartHeight: number
    startTime: number
    time: number
    color: CategoryColor
    categoryIcon: CategoryConfig['icon']
    catShort: string
    name: string
    scoreBefore: number
    points: number | null
    score: number
  }

  let {
    x,
    y,
    chartWidth,
    chartHeight,
    startTime,
    time,
    color,
    categoryIcon: CategoryIcon,
    catShort,
    name,
    scoreBefore,
    points,
    score,
  }: Props = $props()

  const deltaLabel = $derived(points === null ? '+n/a' : `+${points.toLocaleString()}`)
</script>

<ChartTip {x} {y} {chartWidth} {chartHeight} {time} {startTime} categoryColor={color}>
  <solve-challenge>
    <CategoryIcon width="14" height="14" />
    <span data-cat>{catShort} /</span>
    <span data-name>{name}</span>
  </solve-challenge>
  <solve-math>
    <span data-num>{scoreBefore.toLocaleString()} pts</span>
    <span data-delta>{deltaLabel} pts</span>
    <span data-eq>=</span>
    <span data-num>{score.toLocaleString()} pts</span>
  </solve-math>
</ChartTip>

<style>
  solve-challenge {
    display: flex;
    align-items: center;
    gap: var(--space-3xs);
    min-inline-size: 13rem;
    max-inline-size: 16rem;
    color: var(--category-foreground-l1);

    :global(svg) {
      flex-shrink: 0;
    }
  }

  [data-cat] {
    flex-shrink: 0;
    font-weight: var(--font-weight-medium);
  }

  [data-name] {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--category-foreground-l0);
  }

  solve-math {
    display: flex;
    gap: var(--space-3xs);
    margin-block-start: var(--space-3xs);
    padding-block-start: var(--space-2xs);
    border-block-start: 2px solid var(--background-l5);
    font-variant-numeric: tabular-nums;
  }

  [data-num] {
    color: var(--foreground-l1);
  }

  [data-delta] {
    color: var(--foreground-success);
    font-weight: var(--font-weight-medium);
  }

  [data-eq] {
    color: var(--foreground-l4);
  }
</style>
