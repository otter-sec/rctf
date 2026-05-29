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
  import { ArchivedNotice, Button, Card, Spinner } from '$lib/components'
  import { useClientConfig, useCurrentUser } from '$lib/query'
  import { onMount } from 'svelte'

  const clientConfigQuery = useClientConfig()
  const userQuery = useCurrentUser()
  const clientConfig = $derived(clientConfigQuery.data)
  const user = $derived(userQuery.data)
  const isArchived = $derived(clientConfig?.isArchived ?? false)

  const clientId = $derived(page.url.searchParams.get('client_id') ?? '')
  const redirectUri = $derived(page.url.searchParams.get('redirect_uri') ?? '')
  const stateParam = $derived(page.url.searchParams.get('state'))

  let client = $state<{ id: string; name: string; redirectUri: string } | null>(null)
  let loadError = $state<string | null>(null)
  let approving = $state(false)

  // build the same-origin path used by ?next= on login so we come back here after auth
  const selfPath = $derived(page.url.pathname + page.url.search)

  function redirectWithError(err: string) {
    if (!redirectUri) {
      goto('/')
      return
    }
    const sep = redirectUri.includes('?') ? '&' : '?'
    const stateSuffix = stateParam ? `&state=${encodeURIComponent(stateParam)}` : ''
    window.location.href = `${redirectUri}${sep}error=${encodeURIComponent(err)}${stateSuffix}`
  }

  async function loadClient() {
    if (!clientId || !redirectUri) {
      loadError = 'Missing client_id or redirect_uri.'
      return
    }
    try {
      const res = await apiRequest(GetExternalAuthClientRouteV2, { id: clientId })
      if (res.kind !== GoodExternalAuthClient.kind) {
        loadError = 'This integration is not recognized.'
        return
      }
      // bytes-exact match: backend will also reject, but failing fast in the UI
      // avoids issuing a code that won't redirect anywhere useful
      if (res.data.redirectUri !== redirectUri) {
        loadError = 'The redirect URI does not match what was registered for this integration.'
        return
      }
      client = res.data
    } catch (err) {
      loadError = (err as Error).message ?? 'Failed to look up integration.'
    }
  }

  onMount(() => {
    if (!isAuthenticated()) {
      goto('/login?next=' + encodeURIComponent(selfPath))
      return
    }
    loadClient()
  })

  async function approve() {
    if (!client || approving) return
    approving = true
    try {
      const res = await apiRequest(AuthorizeExternalAuthRouteV2, {
        clientId: client.id,
        redirectUri: client.redirectUri,
        ...(stateParam ? { state: stateParam } : {}),
      })
      if (res.kind === GoodExternalAuthAuthorize.kind) {
        window.location.href = res.data.redirectTo
        return
      }
      showApiError(res)
      approving = false
    } catch (err) {
      approving = false
      throw err
    }
  }

  function deny() {
    redirectWithError('access_denied')
  }
</script>

<svelte:head>
  {#if clientConfig}
    <title>Authorize app | {clientConfig.ctfName}</title>
  {/if}
</svelte:head>

{#if clientConfig && isArchived}
  <ArchivedNotice message="Authorization is not available." />
{:else if clientConfig}
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-xl">Authorize app</Card.Title>
      <Card.Description>
        {#if client}
          Grant <span class="text-foreground-l1 font-medium">{client.name}</span> access to your
          {clientConfig.ctfName} account
        {:else}
          Review and approve access to your {clientConfig.ctfName} account
        {/if}
      </Card.Description>
    </Card.Header>
    <Card.Content class="flex flex-col gap-4">
      {#if loadError}
        <p class="text-foreground-destructive text-sm">{loadError}</p>
        <Button onclick={() => goto('/')} variant="outline" class="w-full">Go home</Button>
      {:else if !client || !user}
        <div class="flex justify-center p-6"><Spinner class="size-6" /></div>
      {:else}
        <p class="text-sm">
          <span class="font-semibold">{client.name}</span>
          wants to sign you in as
          <span class="font-semibold">{user.name}</span>. After you authorize, it will receive a
          token that lets it act on your account with the same access you have.
        </p>
        <p class="text-foreground-l3 text-xs">
          Redirects to <code class="break-all">{client.redirectUri}</code>
        </p>
        <div class="flex flex-col gap-2">
          <Button onclick={approve} disabled={approving} class="w-full">
            {#if approving}<Spinner class="size-4" />{/if}
            Authorize
          </Button>
          <Button variant="ghost" onclick={deny} class="w-full">Cancel</Button>
        </div>
      {/if}
    </Card.Content>
  </Card.Root>
{/if}
