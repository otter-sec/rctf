<script lang="ts">
  import { Button, Card } from '$lib/components'
  import ChallengeGrid from './challenge-grid.svelte'

  let { data } = $props()
</script>

{#if data.challenges}
  <ChallengeGrid
    challenges={data.challenges}
    solves={data.user?.solves ?? []}
  />
{:else if data.error}
  <Card.Root class="mx-auto max-w-md">
    <Card.Header>
      <Card.Title class="text-2xl">Challenges</Card.Title>
    </Card.Header>
    <Card.Content>
      <div
        class="bg-background-destructive text-foreground-destructive rounded-md p-3 text-sm"
        role="alert"
      >
        {data.error}
      </div>
    </Card.Content>
  </Card.Root>
{:else}
  <Card.Root class="mx-auto max-w-md">
    <Card.Header>
      <Card.Title class="text-2xl">Challenges</Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-4">
      <p class="text-foreground-l3">
        You need to be logged in to view challenges.
      </p>
      <Button href="/login">Login</Button>
    </Card.Content>
  </Card.Root>
{/if}
