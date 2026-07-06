<script lang="ts">
  import { useClientConfig } from '$lib/query/config'
  import { useLeaderboardChallenges, useSelfUserGraph } from '$lib/query/leaderboard'
  import { useCurrentUser } from '$lib/query/user'
  import Button from '$lib/ui/button.svelte'
  import Card from '$lib/ui/card.svelte'
  import { toChallengeInfos } from './analytics/analytics-data'
  import ProfileAnalytics from './analytics/analytics.svelte'
  import type { GraphSampleInput } from './analytics/graph-data'
  import ProfileHeader from './profile-header.svelte'
  import ProfileSettingsAccount from './settings/account.svelte'
  import ProfileSettingsAvatar from './settings/avatar.svelte'
  import ProfileSettingsCtftime from './settings/ctftime.svelte'
  import ProfileSettingsMembers from './settings/members.svelte'
  import ProfileShell from './shell.svelte'
  import ProfileSolves from './solves/solves.svelte'

  const userQuery = useCurrentUser()
  const configQuery = useClientConfig()
  const challengesQuery = useLeaderboardChallenges()

  const user = $derived(userQuery.data)
  const clientConfig = $derived(configQuery.data)
  const ctfName = $derived(clientConfig?.ctfName)
  const isLoading = $derived(userQuery.isLoading || configQuery.isLoading)

  const challenges = $derived(toChallengeInfos(challengesQuery.data))

  const graphQuery = useSelfUserGraph(
    () => user?.globalPlace ?? null,
    () => user?.id ?? null
  )
  const graphData = $derived<GraphSampleInput | null>(graphQuery.data ?? null)

  const tabs = [
    { value: 'challenges', label: 'Challenges' },
    { value: 'analytics', label: 'Analytics' },
    { value: 'settings', label: 'Settings' },
  ]

  const status = $derived(isLoading ? 'loading' : !user || !clientConfig ? 'unavailable' : 'ready')
</script>

<svelte:head>
  {#if ctfName}
    <title>Profile | {ctfName}</title>
  {/if}
</svelte:head>

<ProfileShell {tabs} desktopColumn="settings" {status}>
  {#snippet unavailable()}
    <Card title="Profile">
      <p>You need to be logged in to view your profile.</p>
      <Button href="/login">Login</Button>
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
      {:else if tab === 'settings'}
        <ProfileSettingsAvatar {user} {clientConfig} />
        <ProfileSettingsAccount {user} {clientConfig} />
        <ProfileSettingsCtftime {user} {clientConfig} />
        <ProfileSettingsMembers {clientConfig} />
      {/if}
    {/if}
  {/snippet}
</ProfileShell>
