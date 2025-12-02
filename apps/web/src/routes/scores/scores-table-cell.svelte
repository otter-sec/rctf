<script lang="ts">
  import { Tooltip } from '$lib/components'
  import {
    IconCircle,
    IconCircleDashed,
    IconCircleNumber1Filled,
    IconCircleNumber2Filled,
    IconCircleNumber3Filled,
  } from '$lib/icons'
  import { formatLocalTime } from '$lib/utils'

  interface Props {
    challengeName: string
    points: number
    solved: boolean
    bloodIndex: number
    solveTime?: number
  }

  let { challengeName, points, solved, bloodIndex, solveTime }: Props = $props()

  const bloodLabels = ['First blood!', 'Second blood!', 'Third blood!'] as const
  const bloodLabel = $derived(
    bloodIndex >= 0 && bloodIndex < 3 ? bloodLabels[bloodIndex] : null
  )
</script>

{#if bloodIndex === 0}
  <Tooltip.Root>
    <Tooltip.Trigger>
      <IconCircleNumber1Filled class="size-7 text-foreground-first-l0" />
    </Tooltip.Trigger>
    <Tooltip.Content side="top" sideOffset={4}>
      <p>{challengeName}</p>
      <p class="text-foreground-l3">{points} pts · {bloodLabel}</p>
      {#if solveTime}<p class="text-foreground-l3">
          {formatLocalTime(solveTime)}
        </p>{/if}
    </Tooltip.Content>
  </Tooltip.Root>
{:else if bloodIndex === 1}
  <Tooltip.Root>
      <Tooltip.Trigger>
        <IconCircleNumber2Filled class="size-7 text-foreground-second-l0" />
    </Tooltip.Trigger>
    <Tooltip.Content side="top" sideOffset={4}>
      <p>{challengeName}</p>
      <p class="text-foreground-l3">{points} pts · {bloodLabel}</p>
      {#if solveTime}<p class="text-foreground-l3">
          {formatLocalTime(solveTime)}
        </p>{/if}
    </Tooltip.Content>
  </Tooltip.Root>
{:else if bloodIndex === 2}
  <Tooltip.Root>
    <Tooltip.Trigger>
      <IconCircleNumber3Filled class="size-7 text-foreground-third-l0" />
    </Tooltip.Trigger>
    <Tooltip.Content side="top" sideOffset={4}>
      <p>{challengeName}</p>
      <p class="text-foreground-l3">{points} pts · {bloodLabel}</p>
      {#if solveTime}<p class="text-foreground-l3">
          {formatLocalTime(solveTime)}
        </p>{/if}
    </Tooltip.Content>
  </Tooltip.Root>
{:else if solved}
  <Tooltip.Root>
    <Tooltip.Trigger>
      <IconCircle class="size-7 text-foreground-success/75" />
    </Tooltip.Trigger>
    <Tooltip.Content side="top" sideOffset={4}>
      <p>{challengeName}</p>
      <p class="text-foreground-l3">{points} pts · Solved!</p>
      {#if solveTime}<p class="text-foreground-l3">
          {formatLocalTime(solveTime)}
        </p>{/if}
    </Tooltip.Content>
  </Tooltip.Root>
{:else}
  <Tooltip.Root>
    <Tooltip.Trigger>
      <IconCircleDashed class="size-7 text-foreground-l5/25" />
    </Tooltip.Trigger>
    <Tooltip.Content side="top" sideOffset={4}>
      <p>{challengeName}</p>
      <p class="text-foreground-l3">{points} pts · Unsolved</p>
    </Tooltip.Content>
  </Tooltip.Root>
{/if}
