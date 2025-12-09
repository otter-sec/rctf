<script lang="ts">
  import { Avatar } from '$lib/components'
  import { cn, getInitials, getRankStylesForPosition } from '$lib/utils'
  import Sparkline from './scores-sparkline.svelte'

  interface SparklinePoint {
    time: number
    score: number
  }

  interface Props {
    id: string
    name: string
    score: number
    solveCount: number
    rank: number
    avatarUrl?: string | null
    isCurrentUser: boolean
    width?: number
    division: string
    divisionPlace: number
    sparklineData?: SparklinePoint[]
    page?: number
    onHover?: () => void
    onUnhover?: () => void
  }

  let {
    id,
    name,
    score,
    solveCount,
    rank,
    avatarUrl,
    isCurrentUser,
    width,
    division,
    divisionPlace,
    sparklineData = [],
    page = 1,
    onHover,
    onUnhover,
  }: Props = $props()

  const styles = $derived(getRankStylesForPosition(rank, isCurrentUser))
  const isFullWidth = $derived(!width)
</script>

<div
  class={cn(
    'sticky left-0 z-10 flex h-16 items-center justify-between px-4',
    isFullWidth ? 'w-full rounded-lg' : 'shrink-0 rounded-l-lg',
    styles.bg,
    isFullWidth
      ? 'before:absolute before:inset-0 before:-z-10 before:rounded-lg before:bg-background-l2 group-hover:before:bg-background-l3'
      : 'before:absolute before:inset-0 before:-z-10 before:rounded-l-lg before:bg-background-l2 group-hover:before:bg-background-l3',
    styles.gradient && [
      isFullWidth
        ? 'after:absolute after:inset-y-0 after:left-0 after:-z-10 after:w-96 after:rounded-lg after:bg-linear-to-r after:to-transparent'
        : 'after:absolute after:inset-y-0 after:left-0 after:-z-10 after:w-96 after:rounded-l-lg after:bg-linear-to-r after:to-transparent',
      styles.gradient,
    ]
  )}
  style:width={width ? `${width}px` : undefined}
>
  <div class="flex items-center gap-3">
    <div class="flex w-16 shrink-0 flex-col items-center">
      <span class={cn('text-xl tabular-nums', styles.fgL0)}>#{rank}</span>
      <span class={cn('text-base tabular-nums', styles.fgL1)}>#{divisionPlace}</span>
    </div>

    <Avatar.Root class="size-12 shrink-0 rounded-lg">
      {#if avatarUrl}
        <Avatar.Image src={avatarUrl} alt={name} class="rounded-lg" />
      {/if}
      <Avatar.Fallback class="rounded-lg text-sm">
        {getInitials(name)}
      </Avatar.Fallback>
    </Avatar.Root>

    <div class="flex h-full w-64 shrink-0 flex-col justify-center">
      <a href="/profile/{id}" class={cn('truncate text-xl hover:underline', styles.fgL0)}>
        {name}
      </a>
      <span class={cn('truncate text-base', styles.fgL1)}>{division}</span>
    </div>
  </div>

  <div class="flex items-center gap-4">
    <div class="flex w-28 shrink-0 flex-col items-end">
      <span class="text-xl tabular-nums text-foreground-l1">
        {score.toLocaleString()} pts
      </span>
      <span class="text-base text-foreground-l3">
        {solveCount} solve{solveCount !== 1 ? 's' : ''}
      </span>
    </div>

    <div class="w-24 shrink-0">
      <Sparkline data={sparklineData} {rank} {isCurrentUser} {page} {onHover} {onUnhover} />
    </div>
  </div>
</div>
