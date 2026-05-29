<script lang="ts">
  import { IconTriangleFilled, IconTriangleInvertedFilled } from '$lib/icons'
  import { cn } from '$lib/utils'

  type Variant = 'points' | 'rank'

  interface Props {
    delta: number | undefined | null
    variant?: Variant
    class?: string
  }

  let { delta, variant = 'points', class: className }: Props = $props()

  const trend = $derived(
    delta && delta > 0 ? 'positive' : delta && delta < 0 ? 'negative' : 'neutral'
  )
  const value = $derived(Math.abs(delta ?? 0).toLocaleString())
  const isRank = $derived(variant === 'rank')
</script>

{#if !isRank || trend !== 'neutral'}
  <span
    class={cn(
      'inline-flex items-center whitespace-nowrap tabular-nums',
      isRank ? 'gap-0.5 text-xs leading-none' : 'gap-1',
      className
    )}
    data-trend={trend}
    data-variant={variant}
  >
    {#if trend === 'positive'}
      <IconTriangleFilled class="icon" />
    {:else if trend === 'negative'}
      <IconTriangleInvertedFilled class="icon" />
    {/if}
    <span data-value>{value}{isRank ? '' : ' pts'}</span>
    {#if !isRank}
      <span data-label>last update</span>
    {/if}
  </span>
{/if}

<style>
  span[data-trend='positive'] [data-value] {
    color: var(--foreground-success);
  }

  span[data-trend='positive'] :global(.icon) {
    color: var(--foreground-success);
  }

  span[data-trend='negative'] [data-value] {
    color: var(--foreground-destructive);
  }

  span[data-trend='negative'] :global(.icon) {
    color: var(--foreground-destructive);
  }

  span[data-trend='neutral'] [data-value] {
    color: var(--foreground-l3);
  }

  [data-label] {
    color: var(--category-foreground-l1);
    opacity: 0.75;
  }

  span :global(.icon) {
    width: 0.625rem;
    height: 0.625rem;
    flex-shrink: 0;
  }

  span[data-variant='rank'] :global(.icon) {
    width: 0.5rem;
    height: 0.5rem;
  }
</style>
