<script lang="ts">
  import type { Challenge, Solve as UserSolve } from '@rctf/types'
  import { useChallengeSolves, useCurrentUser } from '$lib/query'
  import { formatLocalTime, formatRelativeToFirstBlood, getOrdinal } from '$lib/utils'
  import ChallengeRankRow from './challenge-rank-row.svelte'

  interface Props {
    challenge: Challenge
  }

  let { challenge }: Props = $props()

  const userQuery = useCurrentUser()

  const currentUser = $derived($userQuery.data)
  const currentUserSolve = $derived(
    currentUser?.solves.find((s: UserSolve) => s.id === challenge.id)
  )

  const solvesQuery = $derived(useChallengeSolves(challenge.id, { limit: 10, offset: 0 }))
  const firstBloodTime = $derived($solvesQuery.data?.solves?.[0]?.createdAt ?? 0)
  const mySolvePosition = $derived($solvesQuery.data?.mySolvePosition ?? null)
</script>

{#if currentUserSolve && currentUser && mySolvePosition}
  <ChallengeRankRow
    variant="self"
    rankLabel={getOrdinal(mySolvePosition)}
    name={currentUser.name}
    avatarUrl={currentUser.avatarUrl}
    subtitle={currentUser.division}
    primaryValue={formatRelativeToFirstBlood(currentUserSolve.createdAt, firstBloodTime)}
    secondaryValue={formatLocalTime(currentUserSolve.createdAt)}
  />
{/if}
