<script lang="ts">
  import { Button, Card, ScrollArea, Tabs } from '$lib/components'
  import {
    useClientConfig,
    useCurrentUser,
    useLeaderboardChallenges,
    useUserGraph,
  } from '$lib/query'
  import ProfileAnalytics from './profile-analytics.svelte'
  import ProfileHeader from './profile-header.svelte'
  import ProfileSettingsAccount from './profile-settings-account.svelte'
  import ProfileSettingsAvatar from './profile-settings-avatar.svelte'
  import ProfileSettingsMembers from './profile-settings-members.svelte'
  import ProfileSolves from './profile-solves.svelte'

  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()
  const challengesQuery = useLeaderboardChallenges()

  const user = $derived(userQuery.data)
  const clientConfig = $derived(clientConfigQuery.data)
  const challenges = $derived(
    Object.entries(challengesQuery.data ?? {}).map(([id, c]) => ({
      id,
      name: c.name,
      category: c.category,
      points: c.points,
      solves: c.solves,
      scoringKind: c.scoringKind,
    }))
  )

  const graphQuery = useUserGraph(
    () => user?.id ?? '',
    () => user?.globalPlace ?? null
  )
  const graphData = $derived(graphQuery.data ?? null)
</script>

<svelte:head>
  {#if clientConfig}
    <title>Profile | {clientConfig.ctfName}</title>
  {/if}
</svelte:head>

{#snippet solvesPanel()}
  {#if user && clientConfig}
    <ProfileSolves
      {challenges}
      solves={user.solves}
      dynamicScores={user.dynamicScores}
      showUnsolved={challenges.length > 0}
      scrollable
      class="min-h-0 flex-1"
      ctfStartTime={clientConfig.startTime}
    />
  {/if}
{/snippet}

{#snippet analyticsPanel()}
  {#if user && clientConfig}
    <ScrollArea
      class="h-full"
      fadeSize={32}
      fadeColor="background-l1"
      scrollbarYClasses="z-30 mt-4"
      viewportTabIndex={-1}
    >
      <ProfileAnalytics {user} {clientConfig} {challenges} {graphData} />
    </ScrollArea>
  {/if}
{/snippet}

{#snippet settingsPanel()}
  {#if user && clientConfig}
    <ScrollArea
      class="min-h-0 flex-1"
      fadeSize={32}
      fadeColor="background-l1"
      scrollbarYClasses="z-30 mt-4"
      viewportTabIndex={-1}
    >
      <div class="flex flex-col gap-4 px-4 pt-4 pb-4">
        <ProfileSettingsAvatar {user} {clientConfig} />
        <ProfileSettingsAccount {user} {clientConfig} />
        {#if clientConfig.userMembers}
          <ProfileSettingsMembers />
        {/if}
      </div>
    </ScrollArea>
  {/if}
{/snippet}

<div class="flex flex-1 flex-col px-4 md:px-9">
  {#if user && clientConfig}
    <div
      class="bg-background-l1 mx-auto flex h-[calc(100dvh-72px)] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl lg:hidden"
    >
      <div class="bg-background-l1 z-10 shrink-0 pt-2">
        <ProfileHeader {user} {clientConfig} />
      </div>

      <Tabs.Root value="challenges" class="min-h-0 flex-1">
        <div class="bg-background-l1 z-10 shrink-0 px-4 pb-2">
          <Tabs.List class="grid h-10 w-full grid-cols-3">
            <Tabs.Trigger value="challenges">Challenges</Tabs.Trigger>
            <Tabs.Trigger value="analytics">Analytics</Tabs.Trigger>
            <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
          </Tabs.List>
        </div>

        <Tabs.Content value="challenges" class="min-h-0">
          {@render solvesPanel()}
        </Tabs.Content>

        <Tabs.Content value="analytics" class="min-h-0">
          {@render analyticsPanel()}
        </Tabs.Content>

        <Tabs.Content value="settings" class="min-h-0">
          {@render settingsPanel()}
        </Tabs.Content>
      </Tabs.Root>
    </div>

    <div class="mx-auto hidden h-[calc(100dvh-72px)] w-full max-w-400 grid-cols-2 gap-4 lg:grid">
      <div class="bg-background-l1 flex min-h-0 flex-col overflow-hidden rounded-t-3xl">
        <div class="bg-background-l1 z-10 shrink-0 pt-2">
          <ProfileHeader {user} {clientConfig} />
        </div>

        <Tabs.Root value="challenges" class="flex min-h-0 flex-1 flex-col">
          <div class="bg-background-l1 z-10 shrink-0 px-4 pb-2">
            <Tabs.List class="grid h-10 w-full grid-cols-2">
              <Tabs.Trigger value="challenges">Challenges</Tabs.Trigger>
              <Tabs.Trigger value="analytics">Analytics</Tabs.Trigger>
            </Tabs.List>
          </div>

          <Tabs.Content value="challenges" class="min-h-0">
            {@render solvesPanel()}
          </Tabs.Content>

          <Tabs.Content value="analytics" class="min-h-0">
            {@render analyticsPanel()}
          </Tabs.Content>
        </Tabs.Root>
      </div>

      <div class="bg-background-l1 flex min-h-0 flex-col overflow-hidden rounded-t-3xl">
        {@render settingsPanel()}
      </div>
    </div>
  {:else}
    <Card.Root>
      <Card.Header>
        <Card.Title class="text-xl font-medium">Profile</Card.Title>
      </Card.Header>
      <Card.Content class="flex flex-col gap-4">
        <p class="text-foreground-l3">You need to be logged in to view your profile.</p>
        <Button href="/login">Login</Button>
      </Card.Content>
    </Card.Root>
  {/if}
</div>
