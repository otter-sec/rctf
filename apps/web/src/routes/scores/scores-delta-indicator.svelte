<script lang="ts">
  import { IconTriangleFilled, IconTriangleInvertedFilled } from '$lib/icons'

  interface Props {
    delta: number | undefined | null
  }

  let { delta }: Props = $props()
</script>

{#if delta && delta > 0}
  <score-delta trend="positive">
    <IconTriangleFilled class="icon" />
    <span>{delta}</span>
  </score-delta>
{:else if delta && delta < 0}
  <score-delta trend="negative">
    <IconTriangleInvertedFilled class="icon" />
    <span>{Math.abs(delta)}</span>
  </score-delta>
{/if}

<style>
  score-delta {
    display: flex;
    align-items: center;
    gap: 0.125rem;
    font-size: 0.875rem;
    font-variant-numeric: tabular-nums;

    &[trend='positive'] {
      color: var(--foreground-success);
    }

    &[trend='negative'] {
      color: var(--foreground-destructive);
    }

    :global(.icon) {
      width: 0.625rem;
      height: 0.625rem;
      flex-shrink: 0;
    }
  }
</style>
