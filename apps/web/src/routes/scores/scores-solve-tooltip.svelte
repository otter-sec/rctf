<script lang="ts">
  import { Tooltip } from '$lib/components'
  import { formatLocalTime } from '$lib/utils/time'
  import type { TooltipData } from './types'

  interface Props {
    data: TooltipData
    x: number
    y: number
  }

  let { data, x, y }: Props = $props()

  const BLOOD_LABELS = ['First blood!', 'Second blood!', 'Third blood!']
  const statusText = $derived(
    BLOOD_LABELS[data.bloodIndex] ?? (data.solved ? 'Solved!' : 'Unsolved')
  )
</script>

<Tooltip.Provider>
  <Tooltip.Root open>
    <Tooltip.Trigger class="pointer-events-none fixed size-1" style="left:{x}px;top:{y}px;" />
    <Tooltip.Content side="top" sideOffset={4}>
      <p>{data.challengeName}</p>
      <p class="text-foreground-l3">{data.points} pts · {statusText}</p>
      {#if data.solveTime}
        <p class="text-foreground-l3">{formatLocalTime(data.solveTime)}</p>
      {/if}
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
