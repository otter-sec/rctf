<!--
  Dynamic (KotH) podium. Data comes from the limit-4 scores query, which also
  carries the caller's own rank (myPosition). Slot arrangement is shared with the
  flag variant via resolvePodiumSlots; only the detail lines differ: every slot
  reads 'N pts', the self fallback uses the challenge's own yourScore, and the
  empty placeholder reads 'No score'.
-->
<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import { useChallengeScores } from '$lib/query/challenges'
  import { useCurrentUser } from '$lib/query/user'
  import ChallengeDetailsPodiumGrid from './podium-grid.svelte'
  import { resolvePodiumSlots, type PodiumEntry, type PodiumSelf } from './podium-slots'

  interface Props {
    challenge: Challenge
  }

  let { challenge }: Props = $props()

  const scoresQuery = useChallengeScores(
    () => challenge.id,
    () => ({ limit: 4, offset: 0 })
  )
  const userQuery = useCurrentUser()

  // Non-reactive read: true only when this mount actually starts behind the
  // per-slot spinners, so a warm-cache remount doesn't replay the reveal fade.
  const revealAfterLoading = scoresQuery.isPending

  const currentUser = $derived(userQuery.data)
  const topScores = $derived(scoresQuery.data?.scores.slice(0, 4) ?? [])
  const myPosition = $derived(scoresQuery.data?.myPosition ?? null)

  const formatPoints = (points: number): string => `${points.toLocaleString()} pts`

  const slots = $derived.by(() => {
    const top: PodiumEntry[] = topScores.map(score => ({
      userId: score.userId,
      name: score.userName,
      avatarUrl: score.userAvatarUrl,
      detail: formatPoints(score.points),
      isSelf: currentUser?.id === score.userId,
    }))

    const selfEntry: PodiumSelf | null =
      currentUser && myPosition
        ? {
            name: currentUser.name,
            avatarUrl: currentUser.avatarUrl,
            position: myPosition,
            detail: formatPoints(challenge.yourScore ?? 0),
          }
        : null

    const placeholder = currentUser
      ? { name: currentUser.name, avatarUrl: currentUser.avatarUrl, detail: 'No score' }
      : null

    return resolvePodiumSlots({
      top,
      selfEntry,
      placeholder,
      isAuthenticated: !!currentUser,
    })
  })
</script>

<ChallengeDetailsPodiumGrid {slots} loading={scoresQuery.isPending} reveal={revealAfterLoading} />
