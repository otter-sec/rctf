<script lang="ts">
  // TODO(enscribe): don't re-fetch top 3
  import { GetChallengeSolvesRoute, GoodChallengeSolves } from '@rctf/types'
  import { page } from '$app/state'
  import { apiRequest } from '$lib'
  import type { Challenge, Solve as UserSolve } from '$lib/api'
  import { Avatar } from '$lib/components'
  import { cn } from '$lib/utils'
  import { onMount } from 'svelte'

  interface Props {
    challenge: Challenge
    isSolved: boolean
  }

  let { challenge, isSolved }: Props = $props()

  interface Solve {
    id: string
    createdAt: number
    userId: string
    userName: string
  }

  let topSolves = $state<Solve[]>([])

  const currentUser = $derived(page.data.user)
  const currentUserSolve = $derived(
    currentUser?.solves.find((s: UserSolve) => s.id === challenge.id)
  )

  const placementStyles = [
    {
      bg: 'bg-background-first',
      fgL0: 'text-foreground-first-l0',
      fgL1: 'text-foreground-first-l1',
    },
    {
      bg: 'bg-background-second',
      fgL0: 'text-foreground-second-l0',
      fgL1: 'text-foreground-second-l1',
    },
    {
      bg: 'bg-background-third',
      fgL0: 'text-foreground-third-l0',
      fgL1: 'text-foreground-third-l1',
    },
    {
      bg: 'bg-background-self',
      fgL0: 'text-foreground-self-l0',
      fgL1: 'text-foreground-self-l1',
    },
  ]

  const firstBloodTime = $derived(topSolves[0]?.createdAt ?? 0)

  function getOrdinal(n: number): string {
    const suffixes = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    const suffix = suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]
    return `${n}${suffix}`
  }

  function formatFirstBloodTime(timestamp: number): string {
    const ctfStart = page.data.clientConfig.startTime
    const diff = timestamp - ctfStart

    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    const parts: string[] = []
    if (days > 0) parts.push(`${days}d`)
    if (hours % 24 > 0) parts.push(`${hours % 24}hr`)
    if (minutes % 60 > 0 || parts.length === 0) parts.push(`${minutes % 60}m`)

    return parts.join(' ')
  }

  function formatRelativeTime(timestamp: number): string {
    if (!firstBloodTime) return ''
    const diff = timestamp - firstBloodTime

    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      const remainingMins = minutes % 60
      return remainingMins > 0 ? `+${hours}hr ${remainingMins}m` : `+${hours}hr`
    }
    return `+${minutes}m`
  }

  function getInitials(name: string): string {
    return name
      .split(/\s+/)
      .map(word => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  async function fetchSolves() {
    if (!challenge.solves) return

    const response = await apiRequest(GetChallengeSolvesRoute, {
      id: challenge.id,
      limit: 3,
      offset: 0,
    })

    if (response.kind === GoodChallengeSolves.kind) {
      topSolves = response.data.solves
    }
  }

  onMount(() => {
    fetchSolves()
  })
</script>

{#if challenge.solves && challenge.solves > 0}
  <div class="grid grid-cols-4 gap-2">
    {#each placementStyles as style, index}
      {@const isUserSlot = index === 3}
      {@const solve = isUserSlot ? null : topSolves[index]}
      {@const showUserSolve = isUserSlot && isSolved && currentUserSolve}
      {@const hasContent = solve || showUserSolve}
      {@const showEmpty = !hasContent}
      <div
        class={cn(
          'flex h-14 items-center justify-between gap-2 rounded-lg py-1.5 pr-1.5 pl-2',
          showEmpty ? 'border-2 border-dashed border-border' : style.bg
        )}
      >
        {#if !showEmpty}
          <span class={cn('text-base font-medium', style.fgL0)}>
            {isUserSlot ? 'You' : getOrdinal(index + 1)}
          </span>
        {/if}
        {#if solve}
          <div class="flex min-w-0 items-center gap-2">
            <div class="flex min-w-0 flex-col items-end">
              <span
                class={cn('w-full truncate text-right text-base', style.fgL0)}
              >
                {solve.userName}
              </span>
              <span
                class={cn('w-full truncate text-right text-sm', style.fgL1)}
              >
                {index === 0
                  ? formatFirstBloodTime(solve.createdAt)
                  : formatRelativeTime(solve.createdAt)}
              </span>
            </div>
            <Avatar.Root class="size-11 shrink-0 rounded-md text-sm">
              <Avatar.Fallback class={cn('rounded-md', style.bg, style.fgL0)}>
                {getInitials(solve.userName)}
              </Avatar.Fallback>
            </Avatar.Root>
          </div>
        {:else if showUserSolve && currentUser}
          <div class="flex min-w-0 items-center gap-2">
            <div class="flex min-w-0 flex-col items-end">
              <span
                class={cn('w-full truncate text-right text-base', style.fgL0)}
              >
                {currentUser.name}
              </span>
              <span
                class={cn('w-full truncate text-right text-sm', style.fgL1)}
              >
                {formatRelativeTime(currentUserSolve.createdAt)}
              </span>
            </div>
            <Avatar.Root class="size-11 shrink-0 rounded-md text-sm">
              <Avatar.Fallback class={cn('rounded-md', style.bg, style.fgL0)}>
                {getInitials(currentUser.name)}
              </Avatar.Fallback>
            </Avatar.Root>
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}
