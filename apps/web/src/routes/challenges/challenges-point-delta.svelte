<script lang="ts">
  import { IconTriangleFilled, IconTriangleInvertedFilled } from '$lib/icons'
  import { cn } from '$lib/utils'

  interface Props {
    delta: number | undefined | null
    class?: string
  }

  let { delta, class: className }: Props = $props()

  const trend = $derived(
    delta && delta > 0 ? 'positive' : delta && delta < 0 ? 'negative' : 'neutral'
  )
  const value = $derived(Math.abs(delta ?? 0).toLocaleString())
</script>

<span
  class={cn('inline-flex items-center gap-1 whitespace-nowrap tabular-nums', className)}
  data-trend={trend}
>
  {#if trend === 'positive'}
    <IconTriangleFilled class="icon" />
  {:else if trend === 'negative'}
    <IconTriangleInvertedFilled class="icon" />
  {/if}
  <span data-value>{value} pts</span>
  <span data-label>last update</span>
</span>

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
</style>
