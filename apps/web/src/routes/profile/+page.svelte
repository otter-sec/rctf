<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import ProfileSummary from './ProfileSummary.svelte'

  let { data } = $props()
</script>

{#if data.user}
  <ProfileSummary user={data.user} />
{:else}
  <Card.Root class="mx-auto max-w-md">
    <Card.Header>
      <Card.Title class="text-2xl">Profile</Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-4">
      <p class="text-muted-foreground">
        You need to be logged in to view your profile.
      </p>
      <Button href="/login">Login</Button>
    </Card.Content>
  </Card.Root>
{/if}
