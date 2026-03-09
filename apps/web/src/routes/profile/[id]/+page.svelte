<script lang="ts">
  import { page } from '$app/state'
  import { Button, Card, ScrollArea, Spinner } from '$lib/components'
  import {
    useClientConfig,
    useLeaderboardChallenges,
    useUserGraph,
    useUserProfile,
  } from '$lib/query'
  import ProfileGraph from '../profile-graph.svelte'
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

{#if user && clientConfig}
  <div class="mx-auto h-[calc(100dvh-72px)] w-full max-w-3xl">
    <div class="bg-background-l1 flex h-full flex-col overflow-hidden rounded-t-3xl">
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
