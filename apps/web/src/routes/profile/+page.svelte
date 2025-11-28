<script lang="ts">
  import { Button, Card } from '$lib/components'
  import { useClientConfig, useCurrentUser } from '$lib/query'
  import MembersCard from './members-card.svelte'
  import ProfileSummary from './profile-summary.svelte'
  import UpdateProfileCard from './update-profile-card.svelte'

  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()

  const user = $derived($userQuery.data)
  const clientConfig = $derived($clientConfigQuery.data)
</script>

{#if user}
  <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <div class="flex flex-col gap-6">
      <UpdateProfileCard />
      {#if clientConfig?.userMembers}
        <MembersCard />
      {/if}
    </div>
    <div class="flex flex-col gap-6">
      <ProfileSummary />
    </div>
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
