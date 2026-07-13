<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import type { SparklinePoint } from '$lib/chart/sparkline.svelte'
  import { useCurrentUser } from '$lib/query/user'
  import ChallengePointDelta from '../model/point-delta.svelte'
  import { rankVariant } from '../model/solve-times'
  import ChallengeDetailsRow from './details-row.svelte'
  import ScoreTrailing from './score-trailing.svelte'

  interface Props {
    challenge: Challenge
    rank: number
    rankDelta?: number
    showDivision: boolean
    sparkline?: SparklinePoint[]
  }

  let {
    challenge,
    rank,
    rankDelta,
    showDivision,
    sparkline = [],
  }: Props = $props()

  const userQuery = useCurrentUser()
  const user = $derived(userQuery.data)

  const variant = $derived(rankVariant(rank, true))
  const points = $derived(challenge.yourScore ?? 0)
  const pointDelta = $derived(challenge.yourPointDelta ?? 0)
</script>

{#if user}
  <ChallengeDetailsRow
    {variant}
    {rank}
    name={user.name}
    userId={user.id}
    avatarUrl={user.avatarUrl}
    countryCode={user.countryCode}
    globalPlace={user.globalPlace}
    division={showDivision ? user.division : null}
    divisionPlace={showDivision ? user.divisionPlace : null}
    isSelf
  >
    {#snippet rankAccessory()}
      <ChallengePointDelta delta={rankDelta} variant="rank" />
    {/snippet}
    <ScoreTrailing
      {points}
      delta={pointDelta}
      role="self"
      {sparkline}
      sparklineId="{user.id}-pinned"
    />
  </ChallengeDetailsRow>
{/if}
