<script lang="ts">
  import { isAuthenticated } from '$lib'
  import { Button, Card } from '$lib/components'
  import ChallengeGrid from './challenge-grid.svelte'

  let { data } = $props()
</script>

{#if data.challenges}
  <ChallengeGrid
    challenges={data.challenges}
    solves={data.user?.solves ?? []}
  />
{:else}
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-xl">Challenges</Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-4">
      <p class="text-foreground-l3">
        {data.error ?? 'Unknown error'}
      </p>
      <!-- TODO(es3n1n): there should be a common component for this -->
      {#if !isAuthenticated()}
        <Button href="/login">Login</Button>
      {/if}
    </Card.Content>
  </Card.Root>
{/if}
