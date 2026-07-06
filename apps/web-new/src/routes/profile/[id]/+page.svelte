<script lang="ts">
  import { page } from '$app/state'
  import { useClientConfig } from '$lib/query/config'
  import {
    PUBLIC_GRAPH_CACHING,
    useLeaderboardChallenges,
    useSelfUserGraph,
  } from '$lib/query/leaderboard'
  import { useUserById } from '$lib/query/user'
  import Button from '$lib/ui/button.svelte'
  import Card from '$lib/ui/card.svelte'
  import { toChallengeInfos } from '../analytics/analytics-data'
  import ProfileAnalytics from '../analytics/analytics.svelte'
  import type { GraphSampleInput } from '../analytics/graph-data'
  import ProfileHeader from '../profile-header.svelte'
  import ProfileShell from '../shell.svelte'
  import ProfileSolves from '../solves/solves.svelte'

  const userId = $derived(page.params.id ?? '')
  const userQuery = useUserById(() => userId)
  const configQuery = useClientConfig()
  const challengesQuery = useLeaderboardChallenges()

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

  const tabs = [
    { value: 'challenges', label: 'Challenges' },
    { value: 'analytics', label: 'Analytics' },
  ]

  const status = $derived(
    userQuery.isPending ? 'loading' : !user || !clientConfig ? 'unavailable' : 'ready'
  )
</script>

<svelte:head>
  {#if user && ctfName}
    <title>{user.name} | {ctfName}</title>
  {:else if ctfName}
    <title>Profile not found | {ctfName}</title>
  {/if}
</svelte:head>

<ProfileShell {tabs} desktopColumn="analytics" hideTablistOnDesktop {status}>
  {#snippet unavailable()}
    <Card title="Profile not found">
      <p>{userQuery.error?.message ?? 'The requested profile could not be found.'}</p>
      <Button href="/scores">View leaderboard</Button>
    </Card>
  {/snippet}

  {#snippet header()}
    {#if user && clientConfig}
      <ProfileHeader {user} divisions={clientConfig.divisions} />
    {/if}
  {/snippet}

  {#snippet panel(tab: string)}
    {#if user && clientConfig}
      {#if tab === 'challenges'}
        <ProfileSolves
          {challenges}
          solves={user.solves}
          dynamicScores={user.dynamicScores}
          showUnsolved={challenges.length > 0}
          ctfStartTime={clientConfig.startTime}
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
