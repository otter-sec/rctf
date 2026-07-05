<script lang="ts">
  import IconTriangleFilled from '$lib/icons/icon-triangle-filled.svelte'
  import IconTriangleInvertedFilled from '$lib/icons/icon-triangle-inverted-filled.svelte'

  interface Props {
    delta: number | undefined | null
  }

  let { delta }: Props = $props()
</script>

{#if delta && delta > 0}
  <score-delta data-trend="positive">
    <IconTriangleFilled class="delta-icon" />
    <span>{delta}</span>
  </score-delta>
{:else if delta && delta < 0}
  <score-delta data-trend="negative">
    <IconTriangleInvertedFilled class="delta-icon" />
    <span>{Math.abs(delta)}</span>
  </score-delta>
{/if}

<style>
  score-delta {
    display: flex;
    align-items: center;
    gap: 0.125rem;
    font-size: var(--step--1);
    font-variant-numeric: tabular-nums;

    &[data-trend='positive'] {
      color: var(--foreground-success);
    }

    &[data-trend='negative'] {
      color: var(--foreground-destructive);
    }

    :global(.delta-icon) {
      inline-size: 0.625rem;
      block-size: 0.625rem;
      flex-shrink: 0;
    }
  }
</style>
