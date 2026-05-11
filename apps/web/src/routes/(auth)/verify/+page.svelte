<script lang="ts">
  import { GoodEmailSet, GoodRegister, GoodVerify } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { setToken } from '$lib/api'
  import { Button, Card, Spinner } from '$lib/components'
  import { queryKeys, useClientConfig, useVerifyInfo, useVerifyMutation } from '$lib/query'
  import { toast } from 'svelte-sonner'

  const queryClient = useQueryClient()
  const verifyMutation = useVerifyMutation()
  const clientConfigQuery = useClientConfig()

  const verifyToken = $derived(page.url.searchParams.get('token'))
  const verifyInfoQuery = useVerifyInfo(() => verifyToken)
  const verifyInfo = $derived(verifyInfoQuery.data)

  const clientConfig = $derived(clientConfigQuery.data)
  const verifyInfoError = $derived(
    !verifyToken ? 'No verification token provided.' : (verifyInfoQuery.error?.message ?? null)
  )

  let error = $state<string | null>(null)
  let emailSet = $state(false)
  let verified = $state(false)

  const title = $derived.by(() => {
    if (!verifyInfo) return 'Verify email'
    switch (verifyInfo.kind) {
      case 'register':
        return `Registering as ${verifyInfo.name}`
      case 'team':
        return `Logging in as ${verifyInfo.name}`
      case 'update':
        return `Setting email to ${verifyInfo.email} for ${verifyInfo.name}`
    }
  })

  const description = $derived.by(() => {
    if (!verifyInfo) return 'Click the button below to verify your email and continue'
    switch (verifyInfo.kind) {
      case 'register':
        return `Click below to complete your registration with email ${verifyInfo.email}`
      case 'team':
        return 'Click below to log in to your account'
      case 'update':
        return 'Click below to confirm your new email address'
    }
  })

  function handleVerify() {
    if (!verifyToken) {
      error = 'No verification token provided.'
      return
    }

    error = null

    verifyMutation.mutate(
      { verifyToken },
      {
        onSuccess: response => {
          if (response.kind === GoodVerify.kind || response.kind === GoodRegister.kind) {
            setToken(response.data.authToken)
            verified = true
            toast.success('Verified successfully!')
            queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
            setTimeout(() => goto('/'), 500)
          } else if (response.kind === GoodEmailSet.kind) {
            emailSet = true
            toast.success('Email verified!')
            queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
          } else {
            error = response.message
          }
        },
        onError: err => {
          error = err.message
        },
      }
    )
  }
</script>

<svelte:head>
  {#if clientConfig}
    <title>Verify | {clientConfig.ctfName}</title>
  {/if}
</svelte:head>

{#if emailSet}
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-xl">Email verified</Card.Title>
    </Card.Header>
    <Card.Content class="prose">
      <p>Your email has been verified. You can now close this tab.</p>
    </Card.Content>
  </Card.Root>
{:else if verified}
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-xl">Verified</Card.Title>
    </Card.Header>
    <Card.Content class="prose">
      <p>Redirecting you to the home page...</p>
    </Card.Content>
  </Card.Root>
{:else}
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-xl">{title}</Card.Title>
      <Card.Description>{description}</Card.Description>
    </Card.Header>
    <Card.Content>
      {#if verifyInfoError || error}
        <div
          class="bg-background-destructive text-foreground-destructive mb-4 rounded-md p-3 text-sm"
          role="alert"
        >
          {verifyInfoError ?? error}
        </div>
      {/if}

      <Button
        onclick={handleVerify}
        disabled={verifyMutation.isPending || verifyInfoQuery.isPending || !!verifyInfoError}
        class="w-full"
      >
        {#if verifyMutation.isPending}
          <Spinner class="size-4" />
        {/if}
        {#if verifyInfo?.kind === 'register'}
          Complete registration
        {:else if verifyInfo?.kind === 'team'}
          Log in
        {:else if verifyInfo?.kind === 'update'}
          Confirm email
        {:else}
          Verify email
        {/if}
      </Button>
    </Card.Content>
    <Card.Footer>
      <p class="text-foreground-l3 text-sm">
        Wrong link? <a href="/login" class="text-foreground-prose-link hover:underline"
          >Back to login</a
        >.
      </p>
    </Card.Footer>
  </Card.Root>
{/if}
