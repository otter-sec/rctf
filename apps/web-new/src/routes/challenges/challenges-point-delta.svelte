<!--
  Dynamic point/rank movement chip. Shows the signed change from the latest
  scoring tick as a triangle (up = gained, down = lost) plus the magnitude, with
  colour keyed off the trend. The 'points' variant reads 'N pts' with a 'last
  update' caption; the compact 'rank' variant is a chevron for the rank column
  and collapses to nothing when the entry did not move.
-->
<script lang="ts">
  import IconTriangleFilled from '$lib/icons/icon-triangle-filled.svelte'
  import IconTriangleInvertedFilled from '$lib/icons/icon-triangle-inverted-filled.svelte'

  type Variant = 'points' | 'rank'

  interface Props {
    delta: number | undefined | null
    variant?: Variant
  }

  let { delta, variant = 'points' }: Props = $props()

  const trend = $derived(
    delta && delta > 0 ? 'positive' : delta && delta < 0 ? 'negative' : 'neutral'
  )
  const value = $derived(Math.abs(delta ?? 0).toLocaleString())
</script>

{#if variant !== 'rank' || trend !== 'neutral'}
  <point-delta data-trend={trend} data-variant={variant}>
    {#if trend === 'positive'}
      <IconTriangleFilled data-icon />
    {:else if trend === 'negative'}
      <IconTriangleInvertedFilled data-icon />
    {/if}
    <span data-value>{value}{variant === 'rank' ? '' : ' pts'}</span>
    {#if variant !== 'rank'}
      <span data-label>last update</span>
    {/if}
  </point-delta>
{/if}

<style>
  point-delta {
    display: inline-flex;
    align-items: center;
    gap: var(--space-3xs);
    color: var(--foreground-l3);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  point-delta[data-variant='points'] {
    font-size: var(--step--1);
  }

  point-delta[data-variant='rank'] {
    gap: 0.125rem;
    font-size: 0.6875rem;
    line-height: 1;
  }

  point-delta[data-trend='positive'] {
    color: var(--foreground-success);
  }

  point-delta[data-trend='negative'] {
    color: var(--foreground-destructive);
  }

  [data-label] {
    color: var(--category-foreground-l1);
    opacity: 0.75;
  }

  point-delta :global(svg[data-icon]) {
    flex-shrink: 0;
    inline-size: 0.625rem;
    block-size: 0.625rem;
  }

  point-delta[data-variant='rank'] :global(svg[data-icon]) {
    inline-size: 0.5rem;
    block-size: 0.5rem;
  }
</style>
