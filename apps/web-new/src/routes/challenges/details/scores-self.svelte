<!--
  The current user's score rendered as a self-variant row. The scores tab pins a
  copy of this over the scroll container whenever the user's real row is off
  screen (or on a page that has not loaded yet), so their standing stays in view.
  Points and delta come from the challenge's own yourScore/yourPointDelta; the
  rank, rank-movement chevron, and sparkline series are supplied by the parent.
-->
<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import type { SparklinePoint } from '$lib/chart/sparkline.svelte'
  import { useCurrentUser } from '$lib/query/user'
  import ChallengeDetailsRow from './details-row.svelte'
  import ScoreTrailing from './score-trailing.svelte'
  import ChallengePointDelta from '../model/point-delta.svelte'
  import { rankVariant } from '../model/solve-times'

  interface Props {
    challenge: Challenge
    rank: number
    rankDelta?: number
    showDivision: boolean
    sparkline?: SparklinePoint[]
  }

  let { challenge, rank, rankDelta, showDivision, sparkline = [] }: Props = $props()

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
    <!-- A distinct gradient id: the user's real list row may be mounted (just
         clipped) at the same time, and its sparkline uses the bare id. -->
    <ScoreTrailing
      {points}
      delta={pointDelta}
      role="self"
      {sparkline}
      sparklineId="{user.id}-pinned"
    />
  </ChallengeDetailsRow>
{/if}
