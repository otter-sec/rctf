<script lang="ts">
  import { page } from '$app/state'
  import { Button, Card, ProfileStatsCard, SolvesListCard, Spinner } from '$lib/components'
  import { useClientConfig, useUserProfile } from '$lib/query'

  const clientConfigQuery = useClientConfig()
  const clientConfig = $derived($clientConfigQuery.data)

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
  <div class="mx-auto flex flex-col gap-6">
    <ProfileStatsCard
      name={user.name}
      ctftimeId={user.ctftimeId}
      division={user.division}
      divisionLabel={clientConfig.divisions[user.division] ?? user.division}
      score={user.score}
      globalPlace={user.globalPlace}
      divisionPlace={user.divisionPlace} />

    <SolvesListCard
      solves={user.solves}
      emptyMessage="This team hasn't solved any challenges yet." />
  </div>
{:else if isPending}
  <div class="flex flex-1 items-center justify-center">
    <Spinner class="size-4" />
  </div>
{:else}
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-xl">Profile not found</Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-4">
      <p class="text-foreground-l3">
        {error ?? 'The requested profile could not be found.'}
      </p>
      <Button href="/scores">View leaderboard</Button>
    </Card.Content>
  </Card.Root>
{/if}
