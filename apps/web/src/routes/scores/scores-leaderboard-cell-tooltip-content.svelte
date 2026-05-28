<script lang="ts">
  import { formatLocalTime } from '$lib/utils/time'
  import type { TooltipData } from './scores-shared-types'

  const BLOOD_LABELS = ['First blood!', 'Second blood!', 'Third blood!']

  interface Props {
    data: TooltipData
  }

  let { data }: Props = $props()

  function formatDynamicPointDelta(delta: number | undefined): string {
    const value = Math.abs(delta ?? 0).toLocaleString()
    if (delta && delta > 0) return `+${value} pts`
    if (delta && delta < 0) return `-${value} pts`
    return '0 pts'
  }

  function dynamicPointDeltaTrend(delta: number | undefined): string {
    if (delta && delta > 0) return 'positive'
    if (delta && delta < 0) return 'negative'
    return 'neutral'
  }
</script>

{#if data.type === 'category'}
  <p data-title data-category>{data.categoryName}</p>
  <p data-muted>
    {data.total === 0 ? 'Dynamic scoring' : `${data.solved} / ${data.total} solved`}
  </p>
{:else}
  {@const statusText = BLOOD_LABELS[data.bloodIndex] ?? (data.solved ? 'Solved!' : 'Unsolved')}
  <p data-title>{data.challengeName}</p>
  {#if data.isDynamic}
    <p data-muted>Current: {(data.teamPoints ?? 0).toLocaleString()} pts</p>
    <p data-muted>
      Last update:
      <span data-delta={dynamicPointDeltaTrend(data.teamPointDelta)}>
        {formatDynamicPointDelta(data.teamPointDelta)}
      </span>
    </p>
  {:else}
    <p data-muted>{data.points} pts &middot; {statusText}</p>
  {/if}
  {#if !data.isDynamic && data.solveTime}
    <p data-muted>{formatLocalTime(data.solveTime)}</p>
  {/if}
{/if}

<style>
  p {
    margin-block: 0;
    margin-inline: 0;

    &[data-category] {
      text-transform: capitalize;
    }

    &[data-muted] {
      color: var(--foreground-l3);
    }

    span[data-delta='positive'] {
      color: var(--foreground-success);
    }

    span[data-delta='negative'] {
      color: var(--foreground-destructive);
    }

    span[data-delta='neutral'] {
      color: var(--foreground-l5);
      opacity: 0.55;
    }
  }
</style>
