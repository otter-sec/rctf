<script lang="ts">
  import {
    AuthorizeExternalAuthRouteV2,
    GetExternalAuthClientRouteV2,
    GoodExternalAuthAuthorize,
    GoodExternalAuthClient,
  } from '@rctf/types'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { apiRequest, isAuthenticated, showApiError } from '$lib/api'
  import ArchivedNotice from '$lib/components/archived-notice.svelte'
  import { useClientConfig } from '$lib/query/config'
  import { useCurrentUser } from '$lib/query/user'
  import { toast } from '$lib/toast'
  import Button from '$lib/ui/button.svelte'
  import Card from '$lib/ui/card.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import { onMount } from 'svelte'

  const configQuery = useClientConfig()
  const clientConfig = $derived(configQuery.data)
  const userQuery = useCurrentUser()
  const user = $derived(userQuery.data)

  const clientId = $derived(page.url.searchParams.get('client_id') ?? '')
  const redirectUri = $derived(page.url.searchParams.get('redirect_uri') ?? '')
  const stateParam = $derived(page.url.searchParams.get('state'))

  let client = $state<{ id: string; name: string; redirectUri: string } | null>(null)
  let loadError = $state<string | null>(null)
  let approving = $state(false)

  onMount(() => {
    if (!isAuthenticated()) {
      goto('/login?next=' + encodeURIComponent(page.url.pathname + page.url.search))
      return
    }
    loadClient()
  })

  async function loadClient() {
    if (!clientId || !redirectUri) {
      loadError = 'Missing client_id or redirect_uri.'
      return
    }
    try {
      const response = await apiRequest(GetExternalAuthClientRouteV2, { id: clientId })
      if (response.kind !== GoodExternalAuthClient.kind) {
        loadError = 'This integration is not recognized.'
        return
      }
      if (response.data.redirectUri !== redirectUri) {
        loadError = 'The redirect URI does not match what was registered for this integration.'
        return
      }
      client = response.data
    } catch (error) {
      loadError = error instanceof Error ? error.message : 'Failed to look up integration.'
    }
  }

  async function approve() {
    if (!client || approving) return
    approving = true
    try {
      const response = await apiRequest(AuthorizeExternalAuthRouteV2, {
        clientId: client.id,
        redirectUri: client.redirectUri,
        ...(stateParam ? { state: stateParam } : {}),
      })
      if (response.kind === GoodExternalAuthAuthorize.kind) {
        window.location.href = response.data.redirectTo
        return
      }
      showApiError(response)
      approving = false
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Authorization failed')
      approving = false
    }
  }

  function deny() {
    if (!redirectUri) {
      goto('/')
      return
    }
    const separator = redirectUri.includes('?') ? '&' : '?'
    const stateSuffix = stateParam ? `&state=${encodeURIComponent(stateParam)}` : ''
    window.location.href = `${redirectUri}${separator}error=access_denied${stateSuffix}`
  }
</script>

<svelte:head>
  {#if clientConfig}
    <title>Authorize app | {clientConfig.ctfName}</title>
  {/if}
</svelte:head>

{#if clientConfig?.isArchived}
  <ArchivedNotice message="Authorization is not available." />
{:else if clientConfig}
  <Card
    title="Authorize app"
    description={client
      ? `Grant ${client.name} access to your ${clientConfig.ctfName} account`
      : `Review and approve access to your ${clientConfig.ctfName} account`}
  >
    <auth-page>
      {#if loadError}
        <p role="alert">{loadError}</p>
        <Button variant="outline" onclick={() => goto('/')}>Go home</Button>
      {:else if !client || !user}
        <spinner-row><Spinner /></spinner-row>
      {:else}
        <p>
          <strong>{client.name}</strong> wants to sign you in as <strong>{user.name}</strong>. After
          you authorize, it will receive a token that lets it act on your account with the same
          access you have.
        </p>
        <p data-part="redirect-note">Redirects to <code>{client.redirectUri}</code></p>
        <Button onclick={approve} disabled={approving}>
          {#if approving}
            <Spinner />
          {/if}
          Authorize
        </Button>
        <Button variant="ghost" onclick={deny}>Cancel</Button>
      {/if}
    </auth-page>
  </Card>
{/if}

<style>
  auth-page > p[data-part='redirect-note'] {
    font-size: 0.75rem;

    code {
      font-family: var(--font-mono);
      word-break: break-all;
    }
  }

  spinner-row {
    display: flex;
    justify-content: center;
    padding-block: var(--space-s);
    font-size: var(--step-2);
    color: var(--foreground-l3);
  }
</style>
