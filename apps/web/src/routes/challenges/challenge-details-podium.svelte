<script lang="ts">
  import type { Challenge, Solve as UserSolve } from '@rctf/types'
  import { Avatar } from '$lib/components'
  import { useChallengeSolves, useClientConfig, useCurrentUser } from '$lib/query'
  import type { RankVariant } from '$lib/utils'
  import {
    cn,
    formatFirstBloodTime,
    formatRelativeToFirstBlood,
    getInitials,
    getOrdinal,
    getRankStyles,
  } from '$lib/utils'

  interface Props {
    challenge: Challenge
    isSolved: boolean
  }

  let { challenge, isSolved }: Props = $props()

  const solvesQuery = $derived(useChallengeSolves(challenge.id, { limit: 10, offset: 0 }))
  const topSolves = $derived($solvesQuery.data?.solves.slice(0, 4) ?? [])

  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()

  const currentUser = $derived($userQuery.data)
  const clientConfig = $derived($clientConfigQuery.data)
  const ctfStartTime = $derived(clientConfig?.startTime ?? 0)
  const currentUserSolve = $derived(
    currentUser?.solves.find((s: UserSolve) => s.id === challenge.id)
  )
  const firstBloodTime = $derived(topSolves[0]?.createdAt ?? 0)

  interface PodiumItem {
    label: string
    variant: RankVariant
    name: string
    avatarUrl: string | null
    timeLabel: string
  }

  const slotVariants: RankVariant[] = ['first', 'second', 'third', 'nth']

  const isCurrentUserInPodium = $derived(
    currentUser && topSolves.slice(0, 3).some(s => s.userId === currentUser.id)
  )

  const podiumItems = $derived.by((): PodiumItem[] => {
    const emptySlot = (i: number): PodiumItem => ({
      label: '',
      variant: slotVariants[i] ?? 'nth',
      name: '',
      avatarUrl: null,
      timeLabel: '',
    })

    const solveSlot = (
      i: number,
      solve: (typeof topSolves)[number],
      isSelf: boolean
    ): PodiumItem => ({
      label: getOrdinal(i + 1),
      variant: isSelf ? 'self' : (slotVariants[i] ?? 'nth'),
      name: solve.userName,
      avatarUrl: solve.userAvatarUrl ?? null,
      timeLabel:
        i === 0
          ? formatFirstBloodTime(solve.createdAt, ctfStartTime)
          : formatRelativeToFirstBlood(solve.createdAt, firstBloodTime),
    })

    const items: PodiumItem[] = topSolves.slice(0, 3).map((solve, i) => {
      const isSelf = currentUser?.id === solve.userId
      return solveSlot(i, solve, isSelf)
    })

    while (items.length < 3) items.push(emptySlot(items.length))

    const fourthSolve = topSolves[3]
    if (isCurrentUserInPodium || !currentUser) {
      items.push(fourthSolve ? solveSlot(3, fourthSolve, false) : emptySlot(3))
    } else if (isSolved && currentUserSolve) {
      items.push({
        label: 'You',
        variant: 'self',
        name: currentUser.name,
        avatarUrl: currentUser.avatarUrl ?? null,
        timeLabel: formatRelativeToFirstBlood(currentUserSolve.createdAt, firstBloodTime),
      })
    } else {
      items.push({
        label: 'You',
        variant: 'nth',
        name: currentUser.name,
        avatarUrl: currentUser.avatarUrl ?? null,
        timeLabel: 'Unsolved',
      })
    }

    return items
  })
</script>

<div
  class="grid grid-cols-1 gap-2 *:nth-1:hidden *:nth-2:hidden *:nth-3:hidden @md/details:grid-cols-2 @md/details:*:nth-1:flex @2xl/details:grid-cols-3 @2xl/details:*:nth-2:flex @4xl/details:grid-cols-4 @4xl/details:*:nth-3:flex"
>
  {#each podiumItems as item}
    {@const style = getRankStyles(item.variant)}
    {@const isEmpty = !item.name}
    {@const isYouSlot = item.label === 'You'}
    {@const isYouUnsolved = isYouSlot && !isSolved}
    <div
      class={cn(
        'flex h-14 items-center justify-between gap-2 rounded-lg border-2 border-transparent p-1',
        isEmpty || isYouUnsolved ? 'border-border border-dashed' : style.bg
      )}
    >
      {#if item.label}
        <span class={cn('pl-1 text-base', isYouUnsolved ? 'text-foreground-l4' : style.fgL0)}>
          {item.label}
        </span>
      {/if}
      {#if !isEmpty}
        <div class="flex min-w-0 items-center gap-2">
          <div class="flex min-w-0 flex-col items-end">
            <span
              class={cn(
                'w-full truncate text-right text-base',
                isYouUnsolved ? 'text-foreground-l4' : style.fgL0
              )}
            >
              {item.name}
            </span>
            <span
              class={cn(
                'w-full truncate text-right text-sm',
                isYouUnsolved ? 'text-foreground-l5/50' : style.fgL1
              )}
            >
              {item.timeLabel}
            </span>
          </div>
          <Avatar.Root class="size-11 shrink-0 rounded-md text-sm">
            {#if item.avatarUrl}
              <Avatar.Image src={item.avatarUrl} alt={item.name} class="rounded-md" />
            {/if}
            <Avatar.Fallback class="rounded-md">
              {getInitials(item.name)}
            </Avatar.Fallback>
          </Avatar.Root>
        </div>
      {/if}
    </div>
  {/each}
</div>
