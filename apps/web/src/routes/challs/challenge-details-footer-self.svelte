<script lang="ts">
  import type { Challenge, Solve as UserSolve } from '$lib/api'
  import { RankRow } from '$lib/components'
  import { useChallengeSolves, useCurrentUser } from '$lib/query'
  import { formatLocalTime, formatRelativeToFirstBlood } from '$lib/utils'

  interface Props {
    challenge: Challenge
  }

  let { challenge }: Props = $props()

  const userQuery = useCurrentUser()

  const currentUser = $derived($userQuery.data)
  const currentUserSolve = $derived(
    currentUser?.solves.find((s: UserSolve) => s.id === challenge.id)
  )

  const solvesQuery = $derived(
    useChallengeSolves(challenge.id, { limit: 1, offset: 0 })
  )
  const firstBloodTime = $derived(
    $solvesQuery.data?.solves?.[0]?.createdAt ?? 0
  )

  const formattedDivision = $derived(
    currentUser?.division
      ? currentUser.division.charAt(0).toUpperCase() +
          currentUser.division.slice(1) +
          ' Division'
      : 'Division'
  )
</script>

{#if currentUserSolve && currentUser}
  <RankRow
    variant="self"
    rankLabel="You"
    name={currentUser.name}
    subtitle={formattedDivision}
    primaryValue={formatRelativeToFirstBlood(
      currentUserSolve.createdAt,
      firstBloodTime
    )}
    secondaryValue={formatLocalTime(currentUserSolve.createdAt)}
  />
{/if}
