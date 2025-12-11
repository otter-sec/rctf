<script lang="ts">
  import type { Challenge, Solve as UserSolve } from '@rctf/types'
  import { useChallengeSolves, useClientConfig, useCurrentUser } from '$lib/query'
  import { formatLocalTime, formatRelativeToFirstBlood, getOrdinal } from '$lib/utils'
  import ChallengeDetailsSolvesRow from './challenge-details-solves-row.svelte'

  interface Props {
    challenge: Challenge
  }

  let { challenge }: Props = $props()

  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()

  const currentUser = $derived($userQuery.data)
  const clientConfig = $derived($clientConfigQuery.data)
  const currentUserSolve = $derived(
    currentUser?.solves.find((s: UserSolve) => s.id === challenge.id)
  )

  const solvesQuery = $derived(useChallengeSolves(challenge.id, { limit: 10, offset: 0 }))
  const firstBloodTime = $derived($solvesQuery.data?.solves?.[0]?.createdAt ?? 0)
  const mySolvePosition = $derived($solvesQuery.data?.mySolvePosition ?? null)
  const showDivision = $derived(
    clientConfig ? Object.keys(clientConfig.divisions).length > 1 : true
  )
</script>

{#if currentUserSolve && currentUser && mySolvePosition}
  <ChallengeDetailsSolvesRow
    variant="self"
    rankLabel={getOrdinal(mySolvePosition)}
    name={currentUser.name}
    userId={currentUser.id}
    avatarUrl={currentUser.avatarUrl}
    countryCode={currentUser.countryCode}
    globalPlace={currentUser.globalPlace ?? undefined}
    division={showDivision ? currentUser.division : undefined}
    divisionPlace={showDivision ? (currentUser.divisionPlace ?? undefined) : undefined}
    primaryValue={formatRelativeToFirstBlood(currentUserSolve.createdAt, firstBloodTime)}
    secondaryValue={formatLocalTime(currentUserSolve.createdAt)}
  />
{/if}
