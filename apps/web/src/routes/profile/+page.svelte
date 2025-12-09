<script lang="ts">
  import { Button, Card } from '$lib/components'
  import { useChallenges, useClientConfig, useCurrentUser } from '$lib/query'
  import ProfileSolves from './profile-solves.svelte'
  import ProfileTeam from './profile-team.svelte'

  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()
  const challengesQuery = useChallenges()

  const user = $derived($userQuery.data)
  const clientConfig = $derived($clientConfigQuery.data)
  const challenges = $derived($challengesQuery.data ?? [])
</script>

{#if user && clientConfig}
  <div class="mx-auto grid h-[calc(100vh-72px)] w-full max-w-5xl grid-cols-2 gap-4">
    <ProfileTeam {user} {clientConfig} showMembersSection={clientConfig.userMembers} />
    <ProfileSolves {challenges} solves={user.solves} showUnsolved={challenges.length > 0} />
  </div>
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
