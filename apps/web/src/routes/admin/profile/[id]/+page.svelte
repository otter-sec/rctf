<script lang="ts">
  import { DeleteChallengeSolveRouteV2, GoodChallengeSolveDeleteV2, Permissions } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { apiRequest, showApiError } from '$lib/api'
  import { IconQuestion } from '$lib/icons'
  import { useClientConfig } from '$lib/query/config'
  import { queryKeys } from '$lib/query/keys'
  import {
    PUBLIC_GRAPH_CACHING,
    useLeaderboardChallenges,
    useSelfUserGraph,
  } from '$lib/query/leaderboard'
  import { useCurrentUser, useUserById } from '$lib/query/user'
  import { toast } from '$lib/toast'
  import Button from '$lib/ui/button.svelte'
  import StatusCard from '$lib/ui/status-card.svelte'
  import { createAsyncAction } from '$lib/utils/async-action.svelte'
  import { hasPermissions } from '$lib/utils/permissions'
  import { toChallengeInfos } from '../../../profile/analytics/analytics-data'
  import ProfileAnalytics from '../../../profile/analytics/analytics.svelte'
  import type { GraphSampleInput } from '../../../profile/analytics/graph-data'
  import ProfileHeader from '../../../profile/profile-header.svelte'
  import ProfileShell from '../../../profile/shell.svelte'
  import ProfileSolves from '../../../profile/solves/solves.svelte'
  import ConfirmDialog from '../confirm-dialog.svelte'
  import ManagePanel from '../manage-panel.svelte'

  const userId = $derived(page.params.id ?? '')
  const userQuery = useUserById(() => userId)
  const configQuery = useClientConfig()
  const challengesQuery = useLeaderboardChallenges()
  const currentUserQuery = useCurrentUser()
  const queryClient = useQueryClient()

  const user = $derived(userQuery.data)
  const clientConfig = $derived(configQuery.data)
  const ctfName = $derived(clientConfig?.ctfName)

  const challenges = $derived(toChallengeInfos(challengesQuery.data))

  const graphQuery = useSelfUserGraph(
    () => user?.globalPlace ?? null,
    () => userId,
    PUBLIC_GRAPH_CACHING
  )
  const graphData = $derived<GraphSampleInput | null>(graphQuery.data ?? null)

  const canRevoke = $derived(hasPermissions(currentUserQuery.data, Permissions.challsSolveWrite))
  const canViewSubmissions = $derived(hasPermissions(currentUserQuery.data, Permissions.usersWrite))

  const tabs = [
    { value: 'settings', label: 'Manage' },
    { value: 'challenges', label: 'Challenges' },
    { value: 'analytics', label: 'Analytics' },
  ]

  const status = $derived(
    userQuery.isPending ? 'loading' : !user || !clientConfig ? 'unavailable' : 'ready'
  )

  const revokeAction = createAsyncAction<string>()
  let revokeTarget = $state<{ id: string; name: string } | null>(null)

  function requestRevoke(challengeId: string, name: string) {
    revokeTarget = { id: challengeId, name }
  }

  function viewChallengeSubmissions(challengeId: string) {
    goto(
      `/admin/submissions?team=${encodeURIComponent(userId)}&challenge=${encodeURIComponent(challengeId)}`
    )
  }

  async function confirmRevoke() {
    const target = revokeTarget
    revokeTarget = null
    if (!target) return
    await revokeAction.run(
      async () => {
        const response = await apiRequest(DeleteChallengeSolveRouteV2, {
          challengeId: target.id,
          userId,
        })
        if (response.kind === GoodChallengeSolveDeleteV2.kind) {
          toast.success('Solve revoked.')
          queryClient.invalidateQueries({ queryKey: queryKeys.userById(userId) })
          queryClient.invalidateQueries({ queryKey: queryKeys.fullLeaderboard })
        } else {
          showApiError(response)
        }
      },
      { key: target.id, errorMessage: 'Failed to revoke solve' }
    )
  }
</script>

<svelte:head>
  {#if user && ctfName}
    <title>{user.name} | {ctfName}</title>
  {:else if ctfName}
    <title>Team not found | {ctfName}</title>
  {/if}
</svelte:head>

{#key userId}
  <ProfileShell {tabs} desktopColumn="settings" {status}>
    {#snippet unavailable()}
      <StatusCard
        icon={IconQuestion}
        title="Team not found"
        subtitle={userQuery.error?.message ?? 'The requested team could not be found.'}
      >
        <Button href="/admin/teams">Back to teams</Button>
      </StatusCard>
    {/snippet}

    {#snippet header()}
      {#if user && clientConfig}
        <ProfileHeader {user} divisions={clientConfig.divisions} />
      {/if}
    {/snippet}

    {#snippet panel(tab: string)}
      {#if user && clientConfig}
        {#if tab === 'settings'}
          <ManagePanel {userId} />
        {:else if tab === 'challenges'}
          <ProfileSolves
            {challenges}
            solves={user.solves}
            dynamicScores={user.dynamicScores}
            showUnsolved={challenges.length > 0}
            ctfStartTime={clientConfig.startTime}
            onRevoke={canRevoke ? requestRevoke : undefined}
            onViewSubmissions={canViewSubmissions ? viewChallengeSubmissions : undefined}
            revokingId={revokeAction.key}
          />
        {:else if tab === 'analytics'}
          <ProfileAnalytics
            solves={user.solves}
            dynamicScores={user.dynamicScores}
            {graphData}
            {clientConfig}
            {challenges}
            splitDynamicScore={user.dynamicScores.length > 0}
          />
        {/if}
      {/if}
    {/snippet}
  </ProfileShell>
{/key}

<ConfirmDialog
  open={revokeTarget !== null}
  onOpenChange={open => {
    if (!open) revokeTarget = null
  }}
  title="Revoke solve"
  message={`Revoking the solve for "${revokeTarget?.name ?? 'this challenge'}" cannot be undone and will affect the leaderboard.`}
  confirmLabel="Revoke solve"
  destructive
  onConfirm={confirmRevoke}
/>
