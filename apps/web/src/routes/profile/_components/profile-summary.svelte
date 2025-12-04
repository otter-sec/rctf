<script lang="ts">
  import { toast } from '$lib'
  import { Button, Card, ProfileStatsCard, SolvesListCard } from '$lib/components'
  import {
    IconCircleCheckFilled,
    IconCopyPlusFilled,
    IconEyeClosed,
    IconEyeFilled,
  } from '$lib/icons'
  import { useClientConfig, useCurrentUser } from '$lib/query'

  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()

  const user = $derived($userQuery.data)
  const clientConfig = $derived($clientConfigQuery.data)

  let showToken = $state(false)
  let copied = $state(false)

  async function copyToken() {
    if (!user) return
    await navigator.clipboard.writeText(user.teamToken)
    toast.success('Team token copied to clipboard!')
    copied = true
    setTimeout(() => (copied = false), 2000)
  }
</script>

{#if user && clientConfig}
  <div class="flex flex-col gap-6">
    <ProfileStatsCard
      name={user.name}
      email={user.email}
      ctftimeId={user.ctftimeId}
      division={user.division}
      divisionLabel={clientConfig.divisions[user.division] ?? user.division}
      score={user.score}
      globalPlace={user.globalPlace}
      divisionPlace={user.divisionPlace} />

    <Card.Root>
      <Card.Header>
        <Card.Title>Team token</Card.Title>
        <Card.Description
          >Share this token with your teammates so they can login to the same account.</Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="flex items-center gap-2">
          <code
            class="bg-background-l2 flex-1 overflow-hidden text-ellipsis rounded-md border px-3 py-2 font-mono text-sm">
            {#if showToken}
              {user.teamToken}
            {:else}
              {'•'.repeat(32)}
            {/if}
          </code>
          <Button
            variant="outline"
            size="icon"
            onclick={() => (showToken = !showToken)}
            aria-label={showToken ? 'Hide token' : 'Show token'}>
            {#if showToken}
              <IconEyeClosed class="size-4" />
            {:else}
              <IconEyeFilled class="size-4" />
            {/if}
          </Button>
          <Button variant="outline" size="icon" onclick={copyToken} aria-label="Copy token">
            {#if copied}
              <IconCircleCheckFilled class="size-4 text-foreground-success" />
            {:else}
              <IconCopyPlusFilled class="size-4" />
            {/if}
          </Button>
        </div>
      </Card.Content>
    </Card.Root>

    <SolvesListCard
      solves={user.solves}
      emptyMessage="No solves yet. Head over to the challenges page to get started!" />
  </div>
{/if}
