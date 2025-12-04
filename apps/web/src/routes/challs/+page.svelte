<script lang="ts">
  import { isAuthenticated } from '$lib'
  import { Button, Card, Spinner } from '$lib/components'
  import { useChallenges } from '$lib/query'
  import { Root } from './_components'

  const challengesQuery = useChallenges()
  const challenges = $derived($challengesQuery.data)
  const isPending = $derived($challengesQuery.isPending)
  const error = $derived($challengesQuery.error?.message)
</script>

{#if challenges}
  <Root />
{:else if isPending}
  <div class="flex flex-1 items-center justify-center">
    <Spinner class="size-4" />
  </div>
{:else}
  <div class="flex flex-1 items-center justify-center p-4">
    <div class="w-full max-w-md">
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
    </div>
  </div>
{/if}
