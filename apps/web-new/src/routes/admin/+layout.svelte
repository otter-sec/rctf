<script lang="ts">
  import { useClientConfig } from '$lib/query/config'
  import { useCurrentUser } from '$lib/query/user'
  import Button from '$lib/ui/button.svelte'
  import Card from '$lib/ui/card.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import type { LayoutProps } from './$types'
  import { decideAdminGate } from './admin-gate'

  const { children }: LayoutProps = $props()

  const userQuery = useCurrentUser()
  const configQuery = useClientConfig()

  const ctfName = $derived(configQuery.data?.ctfName)
  const isPending = $derived(userQuery.isLoading || configQuery.isLoading)
  const gate = $derived(decideAdminGate(userQuery.data))
</script>

<svelte:head>
  {#if ctfName}
    <title>Admin | {ctfName}</title>
  {/if}
</svelte:head>

{#if isPending}
  <admin-status>
    <Spinner />
  </admin-status>
{:else if gate === 'loggedOut'}
  <admin-status>
    <Card title="Admin access required">
      <p>You need to be logged in with an administrator account to view this page.</p>
      <Button href="/login">Login</Button>
    </Card>
  </admin-status>
{:else if gate === 'noPerms'}
  <admin-status>
    <Card title="Access denied">
      <p>Your account does not have permission to view the admin panel.</p>
      <Button href="/">Home</Button>
    </Card>
  </admin-status>
{:else}
  {@render children()}
{/if}

<style>
  admin-status {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    padding: var(--space-l);
  }

  admin-status :global(ui-card) {
    inline-size: 100%;
    max-inline-size: 28rem;
  }
</style>
