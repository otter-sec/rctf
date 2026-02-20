<script lang="ts">
  import { Button, Card, ScrollArea } from '$lib/components'
  import {
    useClientConfig,
    useCurrentUser,
    useLeaderboardChallenges,
    useUserGraph,
  } from '$lib/query'
  import ProfileGraph from './profile-graph.svelte'
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

{#if user && clientConfig}
  <div class="flex flex-col gap-8 lg:hidden">
    <div class="bg-background-l1 mx-auto flex w-full max-w-3xl flex-col rounded-3xl pb-8 lg:hidden">
      <div class="shrink-0 py-2">
        <ProfileHeader {user} {clientConfig} />
      </div>

      <div class="flex flex-col gap-4 px-4 pt-4">
        <ProfileSettingsAvatar {user} {clientConfig} />
        <ProfileSettingsAccount {user} {clientConfig} />
        {#if clientConfig.userMembers}
          <ProfileSettingsMembers />
        {/if}
      </div>
    </div>

    <div class="bg-background-l1 mx-auto flex w-full max-w-3xl flex-col rounded-3xl">
      {#if graphData && graphData.points.length > 0}
        <div class="px-4 pt-6">
          <ProfileGraph class="h-40 w-full" {graphData} rank={user.globalPlace ?? 0} />
        </div>
      {/if}

      <ProfileSolves {challenges} solves={user.solves} showUnsolved={challenges.length > 0} />
    </div>
  </div>

  <div class="mx-auto hidden h-[calc(100vh-72px)] w-full max-w-4xl grid-cols-5 gap-4 lg:grid">
    <div
      class="bg-background-l1 col-span-3 flex h-[calc(100vh-72px)] flex-col overflow-hidden rounded-t-3xl"
    >
      <div class="bg-background-l1 z-10 shrink-0 py-2">
        <ProfileHeader {user} {clientConfig} />
      </div>

      <ScrollArea
        class="min-h-0 flex-1"
        fadeSize={86}
        fadeColor="background-l1"
        scrollbarYClasses="z-30"
      >
        {#if graphData && graphData.points.length > 0}
          <div class="px-4 pt-2">
            <ProfileGraph class="h-40 w-full" {graphData} rank={user.globalPlace ?? 0} />
          </div>
        {/if}

        <ProfileSolves {challenges} solves={user.solves} showUnsolved={challenges.length > 0} />
      </ScrollArea>
    </div>

    <div
      class="bg-background-l1 col-span-2 flex h-[calc(100vh-72px)] flex-col overflow-hidden rounded-t-3xl"
    >
      <ScrollArea
        class="min-h-0 flex-1"
        fadeSize={32}
        fadeColor="background-l1"
        scrollbarYClasses="z-30 mt-4"
      >
        <div class="flex flex-col gap-4 px-4 pt-4 pb-4">
          <ProfileSettingsAvatar {user} {clientConfig} />
          <ProfileSettingsAccount {user} {clientConfig} />
          {#if clientConfig.userMembers}
            <ProfileSettingsMembers />
          {/if}
        </div>
      </ScrollArea>
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
