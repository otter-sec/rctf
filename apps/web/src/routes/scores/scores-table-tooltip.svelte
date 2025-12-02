<script lang="ts">
  import { Tooltip } from '$lib/components'
  import { formatLocalTime } from '$lib/utils'
  import type { TooltipData } from './types'

  interface Props {
    data: TooltipData | null
    x: number
    y: number
  }

  let { data, x, y }: Props = $props()

  const bloodLabels = ['First blood!', 'Second blood!', 'Third blood!'] as const

  const statusText = $derived.by(() => {
    if (!data) return ''
    if (data.bloodIndex >= 0 && data.bloodIndex < 3) return bloodLabels[data.bloodIndex]
    return data.solved ? 'Solved!' : 'Unsolved'
  })
</script>

{#if data}
  <Tooltip.Provider>
    <Tooltip.Root open>
      <Tooltip.Trigger class="pointer-events-none fixed size-1" style="left: {x}px; top: {y}px;" />
      <Tooltip.Content side="top" sideOffset={4}>
        <p>{data.challengeName}</p>
        <p class="text-foreground-l3">{data.points} pts · {statusText}</p>
        {#if data.solveTime}
          <p class="text-foreground-l3">{formatLocalTime(data.solveTime)}</p>
        {/if}
      </Tooltip.Content>
    </Tooltip.Root>
  </Tooltip.Provider>
{/if}
