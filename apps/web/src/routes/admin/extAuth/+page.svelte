<script lang="ts">
  import { GoodAdminExtAuthClientCreate, GoodAdminExtAuthClientDelete } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { showApiError } from '$lib/api'
  import {
    Button,
    Card,
    Dialog,
    EmptyState,
    Field,
    Input,
    Section,
    Spinner,
    Table,
  } from '$lib/components'
  import { IconCopy, IconKeyFilled, IconTrashFilled } from '$lib/icons'
  import {
    queryKeys,
    useAdminExtAuthClients,
    useCreateExtAuthClientMutation,
    useDeleteExtAuthClientMutation,
  } from '$lib/query'
  import { toast } from 'svelte-sonner'

  const queryClient = useQueryClient()
  const clientsQuery = useAdminExtAuthClients()
  const createMutation = useCreateExtAuthClientMutation()
  const deleteMutation = useDeleteExtAuthClientMutation()

  const clients = $derived(clientsQuery.data ?? [])

  let showCreate = $state(false)
  let formName = $state('')
  let formRedirectUri = $state('')
  let issuedSecret = $state<{
    id: string
    name: string
    redirectUri: string
    secret: string
  } | null>(null)
  let deleteCandidate = $state<{ id: string; name: string } | null>(null)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.adminExtAuthClients })

  function handleCreateSubmit(e: SubmitEvent) {
    e.preventDefault()
    const name = formName.trim()
    const redirectUri = formRedirectUri.trim()
    if (!name || !redirectUri) {
      toast.error('Name and redirect URI are required.')
      return
    }
    createMutation.mutate(
      { name, redirectUri },
      {
        onSuccess: res => {
          if (res.kind === GoodAdminExtAuthClientCreate.kind) {
            issuedSecret = {
              id: res.data.id,
              name: res.data.name,
              redirectUri: res.data.redirectUri,
              secret: res.data.secret,
            }
            formName = ''
            formRedirectUri = ''
            showCreate = false
            invalidate()
          } else {
            showApiError(res)
          }
        },
      }
    )
  }

  function copySecret() {
    if (!issuedSecret) return
    navigator.clipboard.writeText(issuedSecret.secret)
    toast.success('Secret copied to clipboard.')
  }

  function copyClientId(id: string) {
    navigator.clipboard.writeText(id)
    toast.success('Client ID copied.')
  }

  function confirmDelete() {
    if (!deleteCandidate) return
    const id = deleteCandidate.id
    deleteMutation.mutate(
      { id },
      {
        onSuccess: res => {
          if (res.kind === GoodAdminExtAuthClientDelete.kind) {
            toast.success('Client deleted.')
            deleteCandidate = null
            invalidate()
          } else {
            showApiError(res)
          }
        },
      }
    )
  }
</script>

<svelte:head>
  <title>External apps | Admin</title>
</svelte:head>

<div class="mx-auto flex max-w-4xl flex-col gap-4 p-4 md:p-8">
  <header class="flex flex-col gap-2">
    <h1 class="flex items-center gap-2 text-2xl font-semibold">
      <IconKeyFilled class="size-6" />
      External apps
    </h1>
    <p class="text-foreground-l3 text-sm">
      Register external services that can sign users in via the "Sign in with rCTF" flow. The issued
      token grants full account access to the signing-in user.
    </p>
  </header>

  <div class="flex justify-end">
    <Button onclick={() => (showCreate = true)}>Register new app</Button>
  </div>

  {#if clientsQuery.isLoading}
    <div class="flex justify-center p-8"><Spinner class="size-6" /></div>
  {:else if clients.length === 0}
    <EmptyState
      icon={IconKeyFilled}
      title="No external apps registered"
      subtitle="Register an app above to let it use the rCTF sign-in flow."
    />
  {:else}
    <Section.Root>
      <Section.Header>Registered apps</Section.Header>
      <Section.Content class="p-0">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Name</Table.Head>
              <Table.Head>Client ID</Table.Head>
              <Table.Head>Redirect URI</Table.Head>
              <Table.Head>Created</Table.Head>
              <Table.Head class="w-12"></Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each clients as client (client.id)}
              <Table.Row>
                <Table.Cell class="font-medium">{client.name}</Table.Cell>
                <Table.Cell>
                  <button
                    type="button"
                    class="font-mono text-xs hover:underline"
                    onclick={() => copyClientId(client.id)}
                    title="Click to copy"
                  >
                    {client.id}
                  </button>
                </Table.Cell>
                <Table.Cell class="font-mono text-xs">{client.redirectUri}</Table.Cell>
                <Table.Cell class="text-foreground-l3 text-xs">
                  {new Date(client.createdAt).toLocaleDateString()}
                </Table.Cell>
                <Table.Cell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onclick={() => (deleteCandidate = { id: client.id, name: client.name })}
                    aria-label="Delete {client.name}"
                  >
                    <IconTrashFilled class="text-foreground-destructive size-4" />
                  </Button>
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </Section.Content>
    </Section.Root>
  {/if}
</div>

<Dialog.Root open={showCreate} onOpenChange={o => (showCreate = o)}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Register external app</Dialog.Title>
      <Dialog.Description>
        Pick a display name and the exact redirect URI the app uses. The redirect URI must match
        byte-for-byte at /authorize and /token time.
      </Dialog.Description>
    </Dialog.Header>
    <form onsubmit={handleCreateSubmit} class="flex flex-col gap-4">
      <Field.Field>
        <Field.Label for="ext-auth-name">App name</Field.Label>
        <Input
          id="ext-auth-name"
          bind:value={formName}
          placeholder="My Scoring Backend"
          required
          maxlength={100}
        />
      </Field.Field>
      <Field.Field>
        <Field.Label for="ext-auth-redirect">Redirect URI</Field.Label>
        <Input
          id="ext-auth-redirect"
          bind:value={formRedirectUri}
          placeholder="https://example.com/callback"
          required
          maxlength={1024}
        />
      </Field.Field>
      <Dialog.Footer class="gap-2">
        <Button variant="ghost" type="button" onclick={() => (showCreate = false)}>Cancel</Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {#if createMutation.isPending}<Spinner class="size-4" />{/if}
          Register
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root open={!!issuedSecret} onOpenChange={o => !o && (issuedSecret = null)}>
  <Dialog.Content class="sm:max-w-lg">
    <Dialog.Header>
      <Dialog.Title>App registered</Dialog.Title>
      <Dialog.Description>
        Copy the secret now. It is shown only once and cannot be retrieved later - if you lose it,
        delete this app and register a new one.
      </Dialog.Description>
    </Dialog.Header>
    {#if issuedSecret}
      <div class="flex flex-col gap-3">
        <Card.Root>
          <Card.Content class="flex flex-col gap-2 pt-4">
            <div class="flex flex-col gap-1">
              <span class="text-foreground-l3 text-xs">Client ID</span>
              <code class="bg-background-l2 rounded p-2 text-xs break-all">
                {issuedSecret.id}
              </code>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-foreground-l3 text-xs">Client secret</span>
              <code class="bg-background-l2 rounded p-2 text-xs break-all">
                {issuedSecret.secret}
              </code>
            </div>
          </Card.Content>
        </Card.Root>
        <Button onclick={copySecret} variant="outline">
          <IconCopy class="size-4" />
          Copy secret
        </Button>
      </div>
    {/if}
    <Dialog.Footer>
      <Button onclick={() => (issuedSecret = null)}>I have copied the secret</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root open={!!deleteCandidate} onOpenChange={o => !o && (deleteCandidate = null)}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <IconTrashFilled class="text-foreground-destructive size-5" />
        Delete external app
      </Dialog.Title>
      <Dialog.Description>
        Delete "{deleteCandidate?.name}"? Any existing access tokens issued via this app stay valid
        (they are regular rCTF auth tokens), but no new sign-ins will succeed.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer class="gap-2">
      <Button variant="ghost" onclick={() => (deleteCandidate = null)}>Cancel</Button>
      <Button variant="destructive" onclick={confirmDelete} disabled={deleteMutation.isPending}>
        {#if deleteMutation.isPending}<Spinner class="size-4" />{/if}
        Delete app
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
