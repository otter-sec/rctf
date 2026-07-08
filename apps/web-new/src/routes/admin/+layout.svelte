<script lang="ts">
  import { IconSignIn, IconWarningCircle } from '$lib/icons'
  import { useClientConfig } from '$lib/query/config'
  import { useCurrentUser } from '$lib/query/user'
  import Button from '$lib/ui/button.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import StatusCard from '$lib/ui/status-card.svelte'
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
    <StatusCard
      icon={IconSignIn}
      title="Admin access required"
      subtitle="You need to be logged in with an administrator account to view this page."
    >
      <Button href="/login">Login</Button>
    </StatusCard>
  </admin-status>
{:else if gate === 'noPerms'}
  <admin-status>
    <StatusCard
      icon={IconWarningCircle}
      title="Access denied"
      subtitle="Your account does not have permission to view the admin panel."
    >
      <Button href="/">Home</Button>
    </StatusCard>
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
</style>
