<script lang="ts">
  import {
    CreateExternalAuthClientRouteV2,
    DeleteExternalAuthClientRouteV2,
    GoodAdminExternalAuthClientCreate,
    GoodAdminExternalAuthClientDelete,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { apiRequest, showApiError } from '$lib/api'
  import IconCopy from '$lib/icons/icon-copy.svelte'
  import IconTrashFilled from '$lib/icons/icon-trash-filled.svelte'
  import { useAdminExternalAuthClients } from '$lib/query/admin'
  import { queryKeys } from '$lib/query/keys'
  import { toast } from '$lib/toast'
  import Button from '$lib/ui/button.svelte'
  import Dialog from '$lib/ui/dialog.svelte'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import Field from '$lib/ui/field.svelte'
  import Input from '$lib/ui/input.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import { copyText } from '$lib/utils/clipboard'

  type Client = {
    id: string
    name: string
    redirectUri: string
    createdAt: string
    createdBy: string | null
  }

  const queryClient = useQueryClient()
  const clientsQuery = useAdminExternalAuthClients()
  const clients = $derived(clientsQuery.data ?? [])

  const revealAfterLoading = clientsQuery.isPending

  let creating = $state(false)
  let submitting = $state(false)
  let deleting = $state(false)
  let name = $state('')
  let redirectUri = $state('')
  let secretReveal = $state<{ name: string; secret: string } | null>(null)
  let deleteTarget = $state<{ id: string; name: string } | null>(null)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.adminExternalAuthClients })

  function openCreate() {
    creating = true
    name = ''
    redirectUri = ''
  }

  async function submitCreate(event: SubmitEvent) {
    event.preventDefault()
    const trimmedName = name.trim()
    const trimmedRedirect = redirectUri.trim()
    if (!trimmedName || !trimmedRedirect) {
      toast.error('Name and redirect URI are required.')
      return
    }
    submitting = true
    try {
      const response = await apiRequest(CreateExternalAuthClientRouteV2, {
        name: trimmedName,
        redirectUri: trimmedRedirect,
      })
      if (response.kind === GoodAdminExternalAuthClientCreate.kind) {
        const { secret, ...client } = response.data
        queryClient.setQueryData(
          queryKeys.adminExternalAuthClients,
          (old: Client[] | undefined) => [...(old ?? []), client]
        )
        invalidate()
        creating = false
        secretReveal = { name: client.name, secret }
      } else {
        showApiError(response)
      }
    } finally {
      submitting = false
    }
  }

  async function confirmDelete() {
    const target = deleteTarget
    if (!target) return
    deleting = true
    try {
      const response = await apiRequest(DeleteExternalAuthClientRouteV2, {
        id: target.id,
      })
      if (response.kind === GoodAdminExternalAuthClientDelete.kind) {
        toast.success('App deleted.')
        deleteTarget = null
        invalidate()
      } else {
        showApiError(response)
      }
    } finally {
      deleting = false
    }
  }

  const dateFormat = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
</script>

<settings-group>
  <group-header>
    <group-title>External apps</group-title>
    {#if !creating}
      <Button size="sm" variant="outline" onclick={openCreate}>Register app</Button>
    {/if}
  </group-header>
  <group-body>
    <p data-hint>
      The issued token grants full account access to the signing-in user. Only register services you
      trust.
    </p>

    {#if creating}
      <form onsubmit={submitCreate}>
        <Field label="App name">
          {#snippet children({ id, describedBy })}
            <Input
              {id}
              aria-describedby={describedBy}
              bind:value={name}
              placeholder="My scoring backend"
              maxlength={100}
              required
            />
          {/snippet}
        </Field>
        <Field
          label="Redirect URI"
          description="Matched byte-for-byte at authorize and token time."
        >
          {#snippet children({ id, describedBy })}
            <Input
              {id}
              aria-describedby={describedBy}
              bind:value={redirectUri}
              placeholder="https://example.com/callback"
              maxlength={1024}
              required
            />
          {/snippet}
        </Field>
        <form-actions>
          <Button type="button" variant="ghost" onclick={() => (creating = false)}>Cancel</Button>
          <Button type="submit" disabled={submitting}>
            {#if submitting}<Spinner />{/if}
            Register
          </Button>
        </form-actions>
      </form>
    {/if}

    {#if clientsQuery.isPending}
      <loading-row><Spinner /></loading-row>
    {:else if clients.length === 0 && !creating}
      <EmptyState title="No external apps" subtitle="Register a service to issue login tokens." />
    {:else}
      <client-list data-reveal={revealAfterLoading || undefined}>
        {#each clients as client (client.id)}
          <client-row>
            <client-heading>
              <client-name>{client.name || 'Untitled app'}</client-name>
              <client-date>Registered {dateFormat.format(new Date(client.createdAt))}</client-date>
            </client-heading>
            <Field label="Client ID">
              <button
                type="button"
                data-copy
                onclick={() => copyText(client.id, 'Client ID copied.')}
                title="Click to copy"
              >
                <code>{client.id}</code>
                <IconCopy />
              </button>
            </Field>
            <Field label="Redirect URI">
              <code data-readonly>{client.redirectUri}</code>
            </Field>
            <client-actions>
              <Button
                size="sm"
                variant="destructive"
                onclick={() => (deleteTarget = { id: client.id, name: client.name })}
              >
                <IconTrashFilled />
                Delete
              </Button>
            </client-actions>
          </client-row>
        {/each}
      </client-list>
    {/if}
  </group-body>
</settings-group>

<Dialog
  open={secretReveal !== null}
  onOpenChange={open => !open && (secretReveal = null)}
  title="App registered"
  description="Copy the secret now — it is shown only once and cannot be retrieved later. If you lose it, delete the app and register a new one."
>
  {#snippet children({ closeProps })}
    {#if secretReveal}
      <secret-row>
        <code>{secretReveal.secret}</code>
        <Button variant="outline" onclick={() => copyText(secretReveal!.secret, 'Secret copied.')}>
          <IconCopy />
          Copy
        </Button>
      </secret-row>
    {/if}
    <dialog-actions>
      <Button {...closeProps}>I have copied the secret</Button>
    </dialog-actions>
  {/snippet}
</Dialog>

<Dialog
  open={deleteTarget !== null}
  onOpenChange={open => !open && (deleteTarget = null)}
  title="Delete external app"
  description="Existing access tokens issued through this app stay valid — they are regular rCTF auth tokens — but no new sign-ins will succeed."
>
  <dialog-actions>
    <Button variant="ghost" onclick={() => (deleteTarget = null)}>Cancel</Button>
    <Button variant="destructive" onclick={confirmDelete} disabled={deleting}>
      {#if deleting}<Spinner />{/if}
      Delete app
    </Button>
  </dialog-actions>
</Dialog>

<style>
  settings-group {
    display: block;
    overflow: clip;
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
  }

  group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-s);
    min-block-size: 2.75rem;
    padding: var(--space-3xs) var(--space-s);
    background: var(--background-l3);
  }

  group-title {
    color: var(--foreground-l2);
  }

  group-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    padding: var(--space-s);
  }

  p[data-hint] {
    margin: 0;
    font-size: var(--step--1);
    color: var(--foreground-l3);
  }

  form,
  form-actions,
  dialog-actions,
  client-actions {
    display: flex;
  }

  form {
    flex-direction: column;
    gap: var(--space-s);
    padding: var(--space-s);
    background: var(--background-l2);
    border: 2px solid var(--border);
    border-radius: var(--radius-md);
  }

  form-actions,
  dialog-actions {
    justify-content: flex-end;
    gap: var(--space-2xs);
  }

  client-actions {
    justify-content: flex-end;
  }

  loading-row {
    display: flex;
    justify-content: center;
    padding: var(--space-m);
  }

  client-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  client-row {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    padding: var(--space-s);
    background: var(--background-l2);
    border: 2px solid var(--border);
    border-radius: var(--radius-md);
  }

  client-heading {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
  }

  client-date {
    font-size: var(--step--1);
    color: var(--foreground-l4);
  }

  button[data-copy] {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2xs);
    inline-size: 100%;
    padding: var(--space-3xs) var(--space-2xs);
    color: var(--foreground-l1);
    text-align: start;
    background: var(--background-l4);
    border: 2px solid transparent;
    border-radius: var(--radius-md);
    cursor: pointer;

    code {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    :global(svg) {
      flex-shrink: 0;
      color: var(--foreground-l4);
    }

    &:hover {
      background: var(--background-l5);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: -1px;
    }
  }

  code {
    font-family: var(--font-mono);
    font-size: var(--step--1);
  }

  code[data-readonly] {
    display: block;
    padding: var(--space-3xs) var(--space-2xs);
    word-break: break-all;
    background: var(--background-l4);
    border-radius: var(--radius-md);
  }

  secret-row {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);

    code {
      overflow: hidden;
      flex: 1;
      padding: var(--space-2xs);
      white-space: nowrap;
      text-overflow: ellipsis;
      background: var(--background-l4);
      border-radius: var(--radius-md);
    }
  }
</style>
