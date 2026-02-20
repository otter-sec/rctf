<script lang="ts">
  import { Card, Spinner } from '$lib/components'
  import { useAdminChallenges, useClientConfig } from '$lib/query'
  import AdminChallenges from './admin-challenges.svelte'

  const clientConfigQuery = useClientConfig()
  const clientConfig = $derived(clientConfigQuery.data)

  const challengesQuery = useAdminChallenges()
  const challenges = $derived(challengesQuery.data)
  const isPending = $derived(challengesQuery.isPending)
  const error = $derived(challengesQuery.error?.message)
</script>

<svelte:head>
  {#if clientConfig}
    <title>Admin | {clientConfig.ctfName}</title>
  {/if}
</svelte:head>

{#if challenges}
  <AdminChallenges />
{:else if isPending}
  <div class="flex flex-1 items-center justify-center">
    <Spinner class="size-4" />
  </div>
{:else}
  <div class="flex flex-1 items-center justify-center p-4">
    <div class="w-full max-w-md">
      <Card.Root>
        <Card.Header>
          <Card.Title class="text-xl">Admin Challenges</Card.Title>
        </Card.Header>
        <Card.Content>
          <p class="text-foreground-l3">
            {error ?? 'Unknown error'}
          </p>
        </Card.Content>
      </Card.Root>
    </div>
  </div>
{/if}
