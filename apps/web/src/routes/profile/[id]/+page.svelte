<script lang="ts">
  import { page } from '$app/state'
  import { Button, Card, Spinner } from '$lib/components'
  import { useChallenges, useClientConfig, useUserProfile } from '$lib/query'
  import { ProfileLayout } from '../_components'

  const clientConfigQuery = useClientConfig()
  const clientConfig = $derived($clientConfigQuery.data)
  const challengesQuery = useChallenges()
  const challenges = $derived($challengesQuery.data ?? [])

  const userQuery = $derived(useUserProfile(page.params.id!))
  const user = $derived($userQuery.data)
  const isPending = $derived($userQuery.isPending)
  const error = $derived($userQuery.error?.message)
</script>

<svelte:head>
  {#if user && clientConfig}
    <title>{user.name} | {clientConfig.ctfName}</title>
  {:else if clientConfig}
    <title>Profile not found | {clientConfig.ctfName}</title>
  {/if}
</svelte:head>

{#if user && clientConfig}
  <ProfileLayout
    {user}
    divisionLabel={clientConfig.divisions[user.division] ?? user.division}
    {challenges}
  />
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
