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
  <p class="capitalize">{data.categoryName}</p>
  <p class="text-foreground-l3">{data.solved} / {data.total} solved</p>
{:else}
  {@const statusText = BLOOD_LABELS[data.bloodIndex] ?? (data.solved ? 'Solved!' : 'Unsolved')}
  <p>{data.challengeName}</p>
  <p class="text-foreground-l3">{data.points} pts &middot; {statusText}</p>
  {#if data.solveTime}
    <p class="text-foreground-l3">{formatLocalTime(data.solveTime)}</p>
  {/if}
{/if}
