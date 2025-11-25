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
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-xl">Admin access required</Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-4">
      <p class="text-foreground-l3">
        You need to be logged in to access the admin panel.
      </p>
      <Button href="/login">Login</Button>
    </Card.Content>
  </Card.Root>
{:else if !hasReadPerms}
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-xl">Access denied</Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-4">
      <p class="text-foreground-l3">
        You don't have permission to access the admin panel.
      </p>
      <Button href="/">Go home</Button>
    </Card.Content>
  </Card.Root>
{:else}
  {@render children()}
{/if}
