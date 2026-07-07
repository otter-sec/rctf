<script lang="ts">
  import { useCurrentUser } from '$lib/query/user'
  import { rankVariant, solveTimeLabels } from '../model/solve-times'
  import ChallengeDetailsRow from './details-row.svelte'

  interface Props {
    rank: number
    createdAt: number
    firstBloodTime: number
    ctfStartTime: number
    showDivision: boolean
  }

  let { rank, createdAt, firstBloodTime, ctfStartTime, showDivision }: Props = $props()

  const userQuery = useCurrentUser()
  const user = $derived(userQuery.data)

  const variant = $derived(rankVariant(rank, true))
  const labels = $derived(solveTimeLabels({ createdAt, rank, ctfStartTime, firstBloodTime }))
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
    primaryValue={labels.primary}
    secondaryValue={labels.secondary}
  />
{/if}
