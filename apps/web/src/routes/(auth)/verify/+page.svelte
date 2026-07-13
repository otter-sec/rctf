<script lang="ts">
  import {
    GoodEmailSet,
    GoodRegisterV2,
    GoodVerify,
    VerifyRouteV2,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { apiRequest, setToken } from '$lib/api'
  import { useVerifyInfo } from '$lib/query/auth'
  import { useClientConfig } from '$lib/query/config'
  import { queryKeys } from '$lib/query/keys'
  import { toast } from '$lib/toast'
  import Button from '$lib/ui/button.svelte'
  import Card from '$lib/ui/card.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import { createAsyncAction } from '$lib/utils/async-action.svelte'
  import { buildLoginUrl } from '$lib/utils/auth'
  import TeamTokenCard from '../team-token-card.svelte'

  const queryClient = useQueryClient()
  const configQuery = useClientConfig()
  const clientConfig = $derived(configQuery.data)

  const verifyToken = $derived(page.url.searchParams.get('token'))
  const verifyInfoQuery = useVerifyInfo(() => verifyToken)
  const verifyInfo = $derived(verifyInfoQuery.data)

  let error = $state<string | null>(null)
  let emailSet = $state(false)
  let verified = $state(false)
  let registeredTeamToken = $state<string | null>(null)
  let registeredLoginUrl = $state<string | null>(null)
  const verifyAction = createAsyncAction()

  const verifyInfoError = $derived(
    !verifyToken
      ? 'No verification token provided.'
      : (verifyInfoQuery.error?.message ?? null)
  )
  const isVerifyDisabled = $derived(
    verifyAction.pending || verifyInfoQuery.isPending || !!verifyInfoError
  )

  const copy = $derived.by(() => {
    switch (verifyInfo?.kind) {
      case 'register':
        return {
          title: `Registering as ${verifyInfo.name}`,
          description: `Click below to complete your registration with email ${verifyInfo.email}`,
          button: 'Complete registration',
        }
      case 'team':
        return {
          title: `Logging in as ${verifyInfo.name}`,
          description: 'Click below to log in to your account',
          button: 'Log in',
        }
      case 'update':
        return {
          title: `Setting email to ${verifyInfo.email} for ${verifyInfo.name}`,
          description: 'Click below to confirm your new email address',
          button: 'Confirm email',
        }
      default:
        return {
          title: 'Verify email',
          description:
            'Click the button below to verify your email and continue',
          button: 'Verify email',
        }
    }
  })

  let redirectTimer: ReturnType<typeof setTimeout> | undefined
  $effect(() => () => clearTimeout(redirectTimer))

  async function handleVerify() {
    if (!verifyToken) {
      error = 'No verification token provided.'
      return
    }
    error = null
    await verifyAction.run(
      async () => {
        const response = await apiRequest(VerifyRouteV2, { verifyToken })
        if (response.kind === GoodRegisterV2.kind) {
          setToken(response.data.authToken)
          registeredTeamToken = response.data.teamToken
          registeredLoginUrl = buildLoginUrl(response.data.teamToken)
          toast.success('Verified successfully!')
          queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
        } else if (response.kind === GoodVerify.kind) {
          setToken(response.data.authToken)
          verified = true
          toast.success('Verified successfully!')
          queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
          redirectTimer = setTimeout(() => goto('/'), 500)
        } else if (response.kind === GoodEmailSet.kind) {
          emailSet = true
          toast.success('Email verified!')
          queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
        } else {
          error = response.message
        }
      },
      {
        onError: err => {
          error = err instanceof Error ? err.message : 'Verification failed'
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

{#if registeredTeamToken && registeredLoginUrl}
  <TeamTokenCard
    teamToken={registeredTeamToken}
    loginUrl={registeredLoginUrl}
  />
{:else if emailSet}
  <Card title="Email verified">
    <auth-page>
      <p>Your email has been verified. You can now close this tab.</p>
    </auth-page>
  </Card>
{:else if verified}
  <Card title="Verified">
    <auth-page>
      <p>Redirecting you to the home page...</p>
    </auth-page>
  </Card>
{:else}
  <Card title={copy.title} description={copy.description}>
    <auth-page>
      {#if verifyInfoError ?? error}
        <p role="alert">{verifyInfoError ?? error}</p>
      {/if}
      <Button onclick={handleVerify} disabled={isVerifyDisabled}>
        {#if verifyAction.pending}
          <Spinner />
        {/if}
        {copy.button}
      </Button>
      <footer-note>Wrong link? <a href="/login">Back to login</a>.</footer-note>
    </auth-page>
  </Card>
{/if}
