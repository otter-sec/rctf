<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import { useChallengeScores, useClientConfig, useCurrentUser } from '$lib/query'
  import { getRankVariant } from '$lib/utils'
  import ChallengeDetailsSolvesRow from './challenge-details-solves-row.svelte'
  import ChallengeDynamicDelta from './challenge-dynamic-delta.svelte'

  interface Props {
    challenge: Challenge
    rankDelta?: number
  }

  let { challenge, rankDelta }: Props = $props()

  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()

  const currentUser = $derived(userQuery.data)
  const clientConfig = $derived(clientConfigQuery.data)
  const showDivision = $derived(
    clientConfig ? Object.keys(clientConfig.divisions).length > 1 : true
  )

  const scoresQuery = useChallengeScores(
    () => challenge.id,
    () => ({ limit: 1, offset: 0 })
  )
  const myPosition = $derived(scoresQuery.data?.myPosition ?? null)

  const points = $derived(challenge.yourScore ?? 0)
  const pointDelta = $derived(challenge.yourPointDelta ?? 0)

  const variant = $derived(myPosition ? getRankVariant(myPosition, true) : 'self')
</script>

{#if currentUser && myPosition}
  <ChallengeDetailsSolvesRow
    {variant}
    rankLabel={myPosition}
    {rankDelta}
    name={currentUser.name}
    userId={currentUser.id}
    avatarUrl={currentUser.avatarUrl}
    countryCode={currentUser.countryCode}
    globalPlace={currentUser.globalPlace ?? undefined}
    divisionId={showDivision ? currentUser.division : undefined}
    divisionPlace={showDivision ? (currentUser.divisionPlace ?? undefined) : undefined}
    isCurrentUser={true}
  >
    <span class="text-foreground-l1 text-lg whitespace-nowrap tabular-nums sm:text-xl">
      {points.toLocaleString()} pts
    </span>
    <ChallengeDynamicDelta delta={pointDelta} class="justify-end text-sm sm:text-base" />
  </ChallengeDetailsSolvesRow>
{/if}
