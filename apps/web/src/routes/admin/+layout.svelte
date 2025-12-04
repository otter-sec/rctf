<script lang="ts">
  import { Permissions } from '@rctf/types'
  import { Button, Card } from '$lib/components'
  import { useCurrentUser } from '$lib/query'
  import { hasPermissions } from '$lib/utils/permissions'

  let { children } = $props()

  const userQuery = useCurrentUser()
  const user = $derived($userQuery.data)

  const hasReadPerms = $derived(hasPermissions(user, Permissions.challsRead))

  const error = $derived(
    !user
      ? {
          title: 'Admin access required',
          message: 'You need to be logged in to access the admin panel.',
          href: '/login',
          label: 'Login',
        }
      : !hasReadPerms
        ? {
            title: 'Access denied',
            message: "You don't have permission to access the admin panel.",
            href: '/',
            label: 'Go home',
          }
        : null
  )
</script>

{#if error}
  <div class="flex flex-1 items-center justify-center p-4">
    <div class="w-full max-w-md">
      <Card.Root>
        <Card.Header>
          <Card.Title class="text-xl">{error.title}</Card.Title>
        </Card.Header>
        <Card.Content class="flex flex-col gap-4">
          <p class="text-foreground-l3">{error.message}</p>
          <Button href={error.href}>{error.label}</Button>
        </Card.Content>
      </Card.Root>
    </div>
  </div>
{:else}
  {@render children()}
{/if}
