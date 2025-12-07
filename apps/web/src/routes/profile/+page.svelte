<script lang="ts">
  import { Button, Card } from '$lib/components'
  import { useChallenges, useClientConfig, useCurrentUser } from '$lib/query'
  import { MembersCard, ProfileLayout, UpdateAvatarCard, UpdateProfileCard } from './_components'

  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()
  const challengesQuery = useChallenges()

  const user = $derived($userQuery.data)
  const clientConfig = $derived($clientConfigQuery.data)
  const challenges = $derived($challengesQuery.data ?? [])
</script>

{#if user && clientConfig}
  <ProfileLayout
    {user}
    divisionLabel={clientConfig.divisions[user.division] ?? user.division}
    {challenges}>
    <UpdateAvatarCard />
    <UpdateProfileCard />
    {#if clientConfig.userMembers}
      <MembersCard />
    {/if}
  </ProfileLayout>
{:else}
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-xl font-medium">Profile</Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-4">
      <p class="text-foreground-l3">You need to be logged in to view your profile.</p>
      <Button href="/login">Login</Button>
    </Card.Content>
  </Card.Root>
{/if}
