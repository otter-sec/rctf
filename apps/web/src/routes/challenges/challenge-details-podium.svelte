<script lang="ts">
  import type { Challenge, Solve as UserSolve } from '@rctf/types'
  import { useChallengeSolves, useClientConfig, useCurrentUser } from '$lib/query'
  import type { RankVariant } from '$lib/utils'
  import { formatFirstBloodTime, formatRelativeToFirstBlood, getTimeOrdinal } from '$lib/utils'
  import ChallengePodiumGrid, { type PodiumItem } from './challenge-podium-grid.svelte'

  interface Props {
    challenge: Challenge
    isSolved: boolean
  }

  let { challenge, isSolved }: Props = $props()

  const solvesQuery = useChallengeSolves(
    () => challenge.id,
    () => ({ limit: 10, offset: 0 })
  )
  const topSolves = $derived(solvesQuery.data?.solves.slice(0, 4) ?? [])

  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()

  const currentUser = $derived(userQuery.data)
  const clientConfig = $derived(clientConfigQuery.data)
  const ctfStartTime = $derived(clientConfig?.startTime ?? 0)
  const currentUserSolve = $derived(
    currentUser?.solves.find((s: UserSolve) => s.id === challenge.id)
  )
  const firstBloodTime = $derived(topSolves[0]?.createdAt ?? 0)
  const mySolvePosition = $derived(solvesQuery.data?.mySolvePosition ?? null)

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
      detail: '',
    })

    const solveSlot = (
      i: number,
      solve: (typeof topSolves)[number],
      isSelf: boolean
    ): PodiumItem => ({
      label: getTimeOrdinal(i + 1),
      variant: isSelf ? 'self' : (slotVariants[i] ?? 'nth'),
      name: solve.userName,
      avatarUrl: solve.userAvatarUrl ?? null,
      detail:
        i === 0
          ? formatFirstBloodTime(solve.createdAt, ctfStartTime)
          : formatRelativeToFirstBlood(solve.createdAt, firstBloodTime),
      isSelf,
    })

    const items: PodiumItem[] = topSolves.slice(0, 3).map((solve, i) => {
      const isSelf = currentUser?.id === solve.userId
      return solveSlot(i, solve, isSelf)
    })

    while (items.length < 3) items.push(emptySlot(items.length))

    const fourthSolve = topSolves[3]
    if (isCurrentUserInPodium || !currentUser) {
      items.push(fourthSolve ? solveSlot(3, fourthSolve, false) : emptySlot(3))
    } else if (isSolved && currentUserSolve && mySolvePosition) {
      items.push({
        label: getTimeOrdinal(mySolvePosition),
        variant: 'self',
        name: currentUser.name,
        avatarUrl: currentUser.avatarUrl ?? null,
        detail: formatRelativeToFirstBlood(currentUserSolve.createdAt, firstBloodTime),
        isSelf: true,
      })
    } else {
      items.push({
        label: 'You',
        variant: 'nth',
        name: currentUser.name,
        avatarUrl: currentUser.avatarUrl ?? null,
        detail: 'Unsolved',
        isSelf: true,
        isPlaceholder: true,
      })
    }

    return items
  })
</script>

<ChallengePodiumGrid items={podiumItems} />
