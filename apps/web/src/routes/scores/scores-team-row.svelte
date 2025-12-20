<script lang="ts">
  import { Avatar, Tooltip } from '$lib/components'
  import { IconTriangleFilled, IconTriangleInvertedFilled } from '$lib/icons'
  import { cn, getInitials } from '$lib/utils'
  import { countryCodeToFlagFilename, getRankStylesForPosition } from '$lib/utils'
  import { ALL_REGIONS } from '@rctf/const'
  import Sparkline from './sparkline.svelte'

  interface Props {
    id: string
    name: string
    avatarUrl: string | null | undefined
    divisionLabel: string
    divisionPlace: number | null
    countryCode: string | null | undefined
    statusText: string | null | undefined
    score: number
    solveCount: number
    rank: number
    isCurrentUser: boolean
    isFullWidth?: boolean
    sparklineData?: { time: number; score: number }[]
    page?: number
    delta?: number
    showDivision?: boolean
    onHover?: () => void
    onUnhover?: () => void
  }

  let {
    id,
    name,
    avatarUrl,
    divisionLabel,
    divisionPlace,
    countryCode,
    statusText,
    score,
    solveCount,
    rank,
    isCurrentUser,
    isFullWidth = false,
    sparklineData = [],
    page = 1,
    delta,
    showDivision = true,
    onHover,
    onUnhover,
  }: Props = $props()

  const styles = $derived(getRankStylesForPosition(rank, isCurrentUser))
  const flagFilename = $derived(countryCode ? countryCodeToFlagFilename(countryCode) : null)
  const countryName = $derived(
    countryCode ? (ALL_REGIONS.find(r => r.code === countryCode)?.name ?? countryCode) : null
  )
</script>

{#snippet deltaIndicator()}
  {#if delta && delta > 0}
    <div class="text-foreground-success flex items-center gap-0.5 text-sm tabular-nums">
      <IconTriangleFilled class="size-2.5" />
      <span>{delta}</span>
    </div>
  {:else if delta && delta < 0}
    <div class="text-foreground-destructive flex items-center gap-0.5 text-sm tabular-nums">
      <IconTriangleInvertedFilled class="size-2.5" />
      <span>{Math.abs(delta)}</span>
    </div>
  {/if}
{/snippet}

<div
  class={cn(
    'col-team @container/team-info-desktop sticky left-0 z-10 flex h-16 items-center gap-2 px-4',
    'before:bg-background-l2 before:absolute before:inset-0 before:-z-10',
    isFullWidth ? 'rounded-lg before:rounded-lg' : 'rounded-l-lg before:rounded-l-lg',
    styles.bg,
    styles.gradient && [
      'after:absolute after:inset-y-0 after:left-0 after:-z-10 after:w-96 after:bg-linear-to-r after:to-transparent',
      isFullWidth ? 'after:rounded-lg' : 'after:rounded-l-lg',
      styles.gradient,
    ]
  )}
>
  <div class="flex shrink-0 items-center">
    <div class="hidden w-6 @lg/team-info-desktop:block">
      {@render deltaIndicator()}
    </div>
    <div class="flex w-10 flex-col items-center @lg/team-info-desktop:w-16">
      <span class={cn('text-xl tabular-nums', styles.fgL0)}>#{rank}</span>
      {#if showDivision && divisionPlace}
        <Tooltip.Root>
          <Tooltip.Trigger>
            <span class={cn('text-base tabular-nums', styles.fgL1)}>#{divisionPlace}</span>
          </Tooltip.Trigger>
          <Tooltip.Content>{divisionLabel}</Tooltip.Content>
        </Tooltip.Root>
      {/if}
    </div>
  </div>

  <Avatar.Root class="size-12 shrink-0 rounded-lg">
    {#if avatarUrl}
      <Avatar.Image src={avatarUrl} alt={name} class="rounded-lg" />
    {/if}
    <Avatar.Fallback class="rounded-lg text-sm">{getInitials(name)}</Avatar.Fallback>
  </Avatar.Root>

  <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
    <div class="flex items-center gap-1.5">
      <a href="/profile/{id}" class={cn('truncate text-xl hover:underline', styles.fgL0)}>{name}</a>
    </div>
    <div class="flex items-center gap-1">
      {#if flagFilename && countryCode && countryName}
        <Tooltip.Root>
          <Tooltip.Trigger>
            <img src="/flags/{flagFilename}" alt="{countryCode} flag" class="h-5 w-auto shrink-0" />
          </Tooltip.Trigger>
          <Tooltip.Content>{countryName}</Tooltip.Content>
        </Tooltip.Root>
      {/if}
      {#if flagFilename && countryCode && statusText}
        <span class={cn('text-xl leading-none', styles.fgL1)}>·</span>
      {/if}
      {#if statusText}
        <span class={cn('truncate text-base', styles.fgL1)}>{statusText}</span>
      {/if}
    </div>
  </div>

  <div class="flex shrink-0 items-center gap-4">
    <div class="flex w-28 flex-col items-end">
      <span class="text-foreground-l1 text-xl tabular-nums"
        >{score.toLocaleString()} <span class="text-foreground-l3">pts</span></span
      >
      <span class="text-foreground-l3 text-base"
        >{solveCount} solve{solveCount !== 1 ? 's' : ''}</span
      >
    </div>
    <div
      class="pointer-events-none absolute h-10 w-24 opacity-0 @lg/team-info-desktop:pointer-events-auto @lg/team-info-desktop:relative @lg/team-info-desktop:opacity-100"
    >
      <Sparkline data={sparklineData} {rank} {isCurrentUser} {page} {onHover} {onUnhover} />
    </div>
  </div>
</div>
