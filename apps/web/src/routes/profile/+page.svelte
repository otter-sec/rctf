<script lang="ts">
  import { Button, Card } from '$lib/components'
  import MembersCard from './members-card.svelte'
  import ProfileSummary from './profile-summary.svelte'
  import UpdateProfileCard from './update-profile-card.svelte'

  let { data } = $props()
</script>

{#if data.user}
  <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <div class="flex flex-col gap-6">
      <UpdateProfileCard user={data.user} clientConfig={data.clientConfig} />
      {#if data.clientConfig.userMembers}
        <MembersCard />
      {/if}
    </div>
    <div class="flex flex-col gap-6">
      <ProfileSummary user={data.user} clientConfig={data.clientConfig} />
    </div>
  </div>
{:else}
  <Card.Root class="mx-auto max-w-md">
    <Card.Header>
      <Card.Title class="text-2xl">Profile</Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-4">
      <p class="text-foreground-l3">
        You need to be logged in to view your profile.
      </p>
      <Button href="/login">Login</Button>
    </Card.Content>
  </Card.Root>
{/if}
