<script lang="ts">
  import type { CategoryConfig } from '$lib/utils'
  import { formatLocalTime, formatRelativeHoursMinutes } from '$lib/utils/time'

  interface Props {
    time: number
    ctfStart: number
    style: string
    categoryIcon: CategoryConfig['icon']
    categoryKey: string
    challengeName: string
    scoreBefore: number
    points: number | null
    score: number
  }

  let {
    time,
    ctfStart,
    style,
    categoryIcon: CategoryIcon,
    categoryKey,
    challengeName,
    scoreBefore,
    points,
    score,
  }: Props = $props()
</script>

<div
  class="border-background-l5 bg-background-l3 z-50 min-w-56 rounded-lg border-2 px-3 py-2 text-xs shadow-xl"
>
  <div class="text-foreground-l3 mb-1.5">
    <div>{formatRelativeHoursMinutes(time, ctfStart)}</div>
    <div class="text-[10px]">{formatLocalTime(time)}</div>
  </div>
  <div class="flex items-center gap-2" {style}>
    <CategoryIcon class="text-category-foreground-l1 size-3.5 shrink-0" />
    <div class="flex min-w-0 items-baseline gap-1 text-xs font-medium">
      <span class="text-category-foreground-l1 shrink-0">{categoryKey} /</span>
      <span class="text-category-foreground-l0 truncate">{challengeName}</span>
    </div>
  </div>
  <div class="mt-2 border-t-2 pt-2 tabular-nums">
    <span class="text-foreground-l1">{scoreBefore.toLocaleString()} pts</span>
    <span class="text-foreground-success ml-1 font-medium">
      {points === null ? '+n/a' : `+${points.toLocaleString()}`} pts
    </span>
    <span class="text-foreground-l4 mx-1">=</span>
    <span class="text-foreground-l1">{score.toLocaleString()} pts</span>
  </div>
</div>
