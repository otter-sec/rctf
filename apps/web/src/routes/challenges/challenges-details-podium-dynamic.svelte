<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import { useChallengeScores, useCurrentUser } from '$lib/query'
  import type { RankVariant } from '$lib/utils'
  import { getTimeOrdinal } from '$lib/utils'
  import ChallengePodiumGrid, { type PodiumItem } from './challenges-details-podium-grid.svelte'

  interface Props {
    challenge: Challenge
  }

  let { challenge }: Props = $props()

  const scoresQuery = useChallengeScores(
    () => challenge.id,
    () => ({ limit: 4, offset: 0 })
  )
  const topScores = $derived(scoresQuery.data?.scores.slice(0, 4) ?? [])
  const myPosition = $derived(scoresQuery.data?.myPosition ?? null)

  const userQuery = useCurrentUser()
  const currentUser = $derived(userQuery.data)

  const slotVariants: RankVariant[] = ['first', 'second', 'third', 'nth']

  const formatPoints = (points: number): string => `${points.toLocaleString()} pts`

  const isCurrentUserInPodium = $derived(
    currentUser && topScores.slice(0, 3).some(s => s.userId === currentUser.id)
  )

  const podiumItems = $derived.by((): PodiumItem[] => {
    const emptySlot = (i: number): PodiumItem => ({
      label: '',
      variant: slotVariants[i] ?? 'nth',
      name: '',
      avatarUrl: null,
      detail: '',
    })

    const scoreSlot = (
      i: number,
      score: (typeof topScores)[number],
      isSelf: boolean
    ): PodiumItem => ({
      label: getTimeOrdinal(i + 1),
      variant: isSelf ? 'self' : (slotVariants[i] ?? 'nth'),
      name: score.userName,
      avatarUrl: score.userAvatarUrl ?? null,
      detail: formatPoints(score.points),
      isSelf,
    })

    const items: PodiumItem[] = topScores.slice(0, 3).map((score, i) => {
      const isSelf = currentUser?.id === score.userId
      return scoreSlot(i, score, isSelf)
    })

    while (items.length < 3) items.push(emptySlot(items.length))

    const fourthScore = topScores[3]
    if (isCurrentUserInPodium || !currentUser) {
      items.push(fourthScore ? scoreSlot(3, fourthScore, false) : emptySlot(3))
    } else if (myPosition) {
      items.push({
        label: getTimeOrdinal(myPosition),
        variant: 'self',
        name: currentUser.name,
        avatarUrl: currentUser.avatarUrl ?? null,
        detail: formatPoints(challenge.yourScore ?? 0),
        isSelf: true,
      })
    } else {
      items.push({
        label: 'You',
        variant: 'nth',
        name: currentUser.name,
        avatarUrl: currentUser.avatarUrl ?? null,
        detail: 'No score',
        isSelf: true,
        isPlaceholder: true,
      })
    }

    return items
  })
</script>

<ChallengePodiumGrid items={podiumItems} />
