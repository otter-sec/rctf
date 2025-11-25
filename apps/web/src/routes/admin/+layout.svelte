<script lang="ts">
  import { Permissions } from '@rctf/types'
  import { Button, Card } from '$lib/components'

  let { data, children } = $props()

  const hasReadPerms = $derived(
    data.user?.perms !== null &&
      data.user?.perms !== undefined &&
      (data.user.perms & Permissions.challsRead) !== 0
  )
</script>

{#if !data.user}
  <Card.Root class="mx-auto max-w-md">
    <Card.Header>
      <Card.Title class="text-2xl">Admin Access Required</Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-4">
      <p class="text-muted-foreground">
        You need to be logged in to access the admin panel.
      </p>
      <Button href="/login">Login</Button>
    </Card.Content>
  </Card.Root>
{:else if !hasReadPerms}
  <Card.Root class="mx-auto max-w-md">
    <Card.Header>
      <Card.Title class="text-2xl">Access Denied</Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-4">
      <p class="text-muted-foreground">
        You don't have permission to access the admin panel.
      </p>
      <Button href="/">Go Home</Button>
    </Card.Content>
  </Card.Root>
{:else}
  {@render children()}
{/if}

