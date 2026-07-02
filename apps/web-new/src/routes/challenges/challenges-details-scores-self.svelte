<!--
  The current user's score rendered as a self-variant row. The scores tab pins a
  copy of this over the scroll container whenever the user's real row is off
  screen (or on a page that has not loaded yet), so their standing stays in view.
  Points and delta come from the challenge's own yourScore/yourPointDelta; the
  rank and rank-movement chevron are supplied by the parent.
-->
<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import { useCurrentUser } from '$lib/query/user'
  import ChallengeDetailsRow from './challenges-details-row.svelte'
  import ChallengePointDelta from './challenges-point-delta.svelte'
  import { rankVariant } from './solve-times'

  interface Props {
    challenge: Challenge
    rank: number
    rankDelta?: number
    showDivision: boolean
  }

  let { challenge, rank, rankDelta, showDivision }: Props = $props()

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
    <score-points>{points.toLocaleString()} pts</score-points>
    <ChallengePointDelta delta={pointDelta} />
  </ChallengeDetailsRow>
{/if}

<style>
  score-points {
    font-size: var(--step-1);
    font-variant-numeric: tabular-nums;
    color: var(--foreground-l1);
    white-space: nowrap;
  }
</style>
