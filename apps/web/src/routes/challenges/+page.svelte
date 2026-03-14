<script lang="ts">
  import { isAuthenticated } from '$lib/api'
  import { Button, Card, CtfNotStarted, Spinner } from '$lib/components'
  import { ApiError, useChallenges, useClientConfig } from '$lib/query'
  import Challenges from './challenges.svelte'

  const clientConfigQuery = useClientConfig()
  const clientConfig = $derived(clientConfigQuery.data)

  const challengesQuery = useChallenges()
  const challenges = $derived(challengesQuery.data)
  const isPending = $derived(challengesQuery.isPending)
  const error = $derived(challengesQuery.error)
  const isNotStarted = $derived(ApiError.isNotStarted(error))
</script>

<svelte:head>
  {#if clientConfig}
    <title>Challenges | {clientConfig.ctfName}</title>
  {/if}
</svelte:head>

{#if challenges}
  <Challenges />
{:else if isPending}
  <div class="flex flex-1 items-center justify-center">
    <Spinner class="size-4" />
  </div>
{:else if isNotStarted}
  <CtfNotStarted />
{:else}
  <div class="flex flex-1 items-center justify-center p-4">
    <div class="w-full max-w-md">
      <Card.Root>
        <Card.Header>
          <Card.Title class="text-xl">Challenges</Card.Title>
        </Card.Header>
        <Card.Content class="flex flex-col gap-4">
          <p class="text-foreground-l3">
            {error?.message ?? 'Unknown error'}
          </p>
          {#if !isAuthenticated()}
            <Button href="/login">Login</Button>
          {/if}
        </Card.Content>
      </Card.Root>
    </div>
  </div>
{/if}
