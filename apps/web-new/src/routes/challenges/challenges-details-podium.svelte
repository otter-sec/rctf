<!--
  Flag-challenge podium. Data comes from the limit-10 self solves query, off
  which we take the top four rows, the first-blood time and the caller's own
  placement. The slot arrangement (top three, self-vs-placeholder fourth slot,
  self-is-4th dedupe) lives in resolvePodiumSlots; this component only shapes the
  variant-specific detail lines: a duration from CTF start for first blood, a
  '+delta' from first blood for everyone below it.
-->
<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import { useChallengeSolvesSelf } from '$lib/query/challenges'
  import { useClientConfig } from '$lib/query/config'
  import { useCurrentUser } from '$lib/query/user'
  import ChallengeDetailsPodiumGrid from './challenges-details-podium-grid.svelte'
  import { resolvePodiumSlots, type PodiumEntry, type PodiumSelf } from './podium-slots'
  import { solveTimeLabels } from './solve-times'

  interface Props {
    challenge: Challenge
    isSolved: boolean
  }

  let { challenge, isSolved }: Props = $props()

  const solvesQuery = useChallengeSolvesSelf(() => challenge.id)
  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()

  const currentUser = $derived(userQuery.data)
  const ctfStartTime = $derived(clientConfigQuery.data?.startTime ?? 0)
  const topSolves = $derived(solvesQuery.data?.solves.slice(0, 4) ?? [])
  const firstBloodTime = $derived(topSolves[0]?.createdAt ?? 0)
  const mySolvePosition = $derived(solvesQuery.data?.mySolvePosition ?? null)
  const currentUserSolve = $derived(currentUser?.solves.find(solve => solve.id === challenge.id))

  const slots = $derived.by(() => {
    const top: PodiumEntry[] = topSolves.map((solve, index) => ({
      userId: solve.userId,
      name: solve.userName,
      avatarUrl: solve.userAvatarUrl,
      detail: solveTimeLabels({
        createdAt: solve.createdAt,
        rank: index + 1,
        ctfStartTime,
        firstBloodTime,
      }).primary,
      isSelf: currentUser?.id === solve.userId,
    }))

    const selfEntry: PodiumSelf | null =
      isSolved && currentUser && currentUserSolve && mySolvePosition
        ? {
            name: currentUser.name,
            avatarUrl: currentUser.avatarUrl,
            position: mySolvePosition,
            detail: solveTimeLabels({
              createdAt: currentUserSolve.createdAt,
              rank: mySolvePosition,
              ctfStartTime,
              firstBloodTime,
            }).primary,
          }
        : null

    const placeholder = currentUser
      ? { name: currentUser.name, avatarUrl: currentUser.avatarUrl, detail: 'Unsolved' }
      : null

    return resolvePodiumSlots({
      top,
      selfEntry,
      placeholder,
      isAuthenticated: !!currentUser,
    })
  })
</script>

<ChallengeDetailsPodiumGrid {slots} />
