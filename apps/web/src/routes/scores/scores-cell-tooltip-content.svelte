<script lang="ts">
  import { formatLocalTime } from '$lib/utils/time'
  import type { TooltipData } from './types'

  const BLOOD_LABELS = ['First blood!', 'Second blood!', 'Third blood!']

  interface Props {
    data: TooltipData
  }

  let { data }: Props = $props()
</script>

{#if data.type === 'category'}
  <p data-title data-category>{data.categoryName}</p>
  <p data-muted>{data.solved} / {data.total} solved</p>
{:else}
  {@const statusText = BLOOD_LABELS[data.bloodIndex] ?? (data.solved ? 'Solved!' : 'Unsolved')}
  <p data-title>{data.challengeName}</p>
  <p data-muted>{data.points} pts &middot; {statusText}</p>
  {#if data.solveTime}
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
  }
</style>
