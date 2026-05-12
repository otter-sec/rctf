<script lang="ts">
  import { page } from '$app/state'
  import { Button, Card, ScrollArea, Spinner, Tabs } from '$lib/components'
  import {
    useClientConfig,
    useLeaderboardChallenges,
    useUserGraph,
    useUserProfile,
  } from '$lib/query'
  import ProfileAnalytics from '../profile-analytics.svelte'
  import ProfileHeader from '../profile-header.svelte'
  import ProfileSolves from '../profile-solves.svelte'

  const clientConfigQuery = useClientConfig()
  const clientConfig = $derived(clientConfigQuery.data)
  const challengesQuery = useLeaderboardChallenges()
  const challenges = $derived(
    Object.entries(challengesQuery.data ?? {}).map(([id, c]) => ({
      id,
      name: c.name,
      category: c.category,
      points: c.points,
      solves: c.solves,
    }))
  )

  const userQuery = useUserProfile(() => page.params.id!)
  const user = $derived(userQuery.data)
  const isPending = $derived(userQuery.isPending)
  const error = $derived(userQuery.error?.message)

  const graphQuery = useUserGraph(
    () => page.params.id!,
    () => user?.globalPlace ?? null
  )
  const graphData = $derived(graphQuery.data ?? null)
</script>

<svelte:head>
  {#if user && clientConfig}
    <title>{user.name} | {clientConfig.ctfName}</title>
  {:else if clientConfig}
    <title>Profile not found | {clientConfig.ctfName}</title>
  {/if}
</svelte:head>

{#snippet solvesPanel()}
  {#if user}
    <ProfileSolves
      {challenges}
      solves={user.solves}
      showUnsolved={challenges.length > 0}
      scrollable
      class="min-h-0 flex-1"
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

{#if user && clientConfig}
  <div
    class="bg-background-l1 mx-auto flex h-[calc(100dvh-72px)] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl lg:hidden"
  >
    <div class="bg-background-l1 z-10 shrink-0 pt-2">
      <ProfileHeader {user} {clientConfig} />
    </div>

    <Tabs.Root value="challenges" class="min-h-0 flex-1">
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

  <div
    class="mx-auto hidden h-[calc(100dvh-72px)] w-full max-w-400 grid-cols-[minmax(0,1fr)_minmax(520px,1fr)] gap-4 lg:grid"
  >
    <div class="bg-background-l1 flex min-h-0 flex-col overflow-hidden rounded-t-3xl">
      <div class="bg-background-l1 z-10 shrink-0 pt-2">
        <ProfileHeader {user} {clientConfig} />
      </div>

      {@render solvesPanel()}
    </div>

    <div class="bg-background-l1 min-h-0 overflow-hidden rounded-t-3xl">
      {@render analyticsPanel()}
    </div>
  </div>
{:else if isPending}
  <div class="flex flex-1 items-center justify-center">
    <Spinner class="size-4" />
  </div>
{:else}
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-xl font-medium">Profile not found</Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-4">
      <p class="text-foreground-l3">
        {error ?? 'The requested profile could not be found.'}
      </p>
      <Button href="/scores">View leaderboard</Button>
    </Card.Content>
  </Card.Root>
{/if}
