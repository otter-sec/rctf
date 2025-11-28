<script lang="ts">
  import { isAuthenticated } from '$lib'
  import { Button, Card } from '$lib/components'
  import { useChallenges } from '$lib/query'
  import ChallengeGrid from './challenge-grid.svelte'

  const challengesQuery = useChallenges()
  const challenges = $derived($challengesQuery.data)
  const error = $derived($challengesQuery.error?.message)
</script>

{#if challenges}
  <ChallengeGrid />
{:else}
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-xl">Challenges</Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-4">
      <p class="text-foreground-l3">
        {error ?? 'Unknown error'}
      </p>
      {#if !isAuthenticated()}
        <Button href="/login">Login</Button>
      {/if}
    </Card.Content>
  </Card.Root>
{/if}
