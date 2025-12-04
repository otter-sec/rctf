<script lang="ts">
  import { Card, Spinner } from '$lib/components'
  import { useAdminChallenges } from '$lib/query'
  import { Root } from './_components'

  const challengesQuery = useAdminChallenges()
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
