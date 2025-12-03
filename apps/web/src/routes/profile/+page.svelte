<script lang="ts">
  import { Button, Card } from '$lib/components'
  import { useClientConfig, useCurrentUser } from '$lib/query'
  import { MembersCard, ProfileSummary, UpdateProfileCard } from './_components'

  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()

  const user = $derived($userQuery.data)
  const clientConfig = $derived($clientConfigQuery.data)
</script>

{#if user}
  <div class="flex flex-col gap-6">
    <ProfileSummary />
    <UpdateProfileCard />
    {#if clientConfig?.userMembers}
      <MembersCard />
    {/if}
  </div>
{:else}
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-xl">Profile</Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-4">
      <p class="text-foreground-l3">
        You need to be logged in to view your profile.
      </p>
      <Button href="/login">Login</Button>
    </Card.Content>
  </Card.Root>
{/if}
