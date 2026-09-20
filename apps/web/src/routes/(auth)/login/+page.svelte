<script lang="ts">
  import {
    BadUnknownUser,
    GoodLogin,
    LoginRoute,
    LoginRouteV2,
    ProtectedAction,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { apiRequest, isAuthenticated, setToken, showApiError } from '$lib/api'
  import ArchivedNotice from '$lib/components/archived-notice.svelte'
  import CaptchaNotice from '$lib/components/captcha-notice.svelte'
  import { useApiForm } from '$lib/forms/use-api-form.svelte'
  import { useClientConfig } from '$lib/query/config'
  import { queryKeys } from '$lib/query/keys'
  import { toast } from '$lib/toast'
  import Button from '$lib/ui/button.svelte'
  import Card from '$lib/ui/card.svelte'
  import Field from '$lib/ui/field.svelte'
  import Input from '$lib/ui/input.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import { createAsyncAction } from '$lib/utils/async-action.svelte'
  import { getRedirectPath } from '$lib/utils/redirect'
  import { onMount } from 'svelte'
  import ButtonCtftime from '../button-ctftime.svelte'

  const queryClient = useQueryClient()
  const configQuery = useClientConfig()
  const clientConfig = $derived(configQuery.data)

  const passwordForm = useApiForm(LoginRouteV2, {
    onSuccess: response => handleLoginSuccess(response.data.authToken),
  })

  const form = useApiForm(LoginRoute, {
    onSuccess: response => handleLoginSuccess(response.data.authToken),
  })

  const ctftimeLoginAction = createAsyncAction()
  let loginLinkSupplied = $state(false)
  let replacingSession = $state(false)
  let useTeamToken = $state(false)
  const activeForm = $derived(useTeamToken ? form : passwordForm)
  const isPending = $derived(
    form.submitting || passwordForm.submitting || ctftimeLoginAction.pending
  )

  function handleLoginSuccess(authToken: string) {
    setToken(authToken)
    toast.success('Logged in successfully!')
    queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
    goto(getRedirectPath(page.url.searchParams.get('next'), page.url.origin))
  }

  async function handleCtftimeDone(data: {
    ctftimeToken: string
    ctftimeName: string
  }) {
    await ctftimeLoginAction.run(
      async () => {
        const response = await apiRequest(LoginRoute, {
          ctftimeToken: data.ctftimeToken,
        })
        if (response.kind === GoodLogin.kind) {
          handleLoginSuccess(response.data.authToken)
        } else if (response.kind === BadUnknownUser.kind) {
          sessionStorage.setItem('ctftimeToken', data.ctftimeToken)
          sessionStorage.setItem('ctftimeName', data.ctftimeName)
          goto('/register')
        } else {
          showApiError(response)
        }
      },
      { errorMessage: 'Login failed' }
    )
  }

  function toggleMode() {
    useTeamToken = !useTeamToken
    form.clearErrors()
    passwordForm.clearErrors()
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    if (!useTeamToken) {
      return passwordForm.submit()
    }

    const value = form.data.teamToken ?? ''
    try {
      const url = new URL(value)
      const urlToken = url.searchParams.get('token')
      if (urlToken) {
        form.setData({ teamToken: urlToken })
      }
    } catch {}
    form.submit()
  }

  onMount(() => {
    const cleanUrl = new URL(page.url)
    const token = cleanUrl.searchParams.get('token')
    if (token === null) return

    cleanUrl.searchParams.delete('token')
    window.history.replaceState(
      window.history.state,
      '',
      `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`
    )
    if (!token) return

    replacingSession = isAuthenticated()
    loginLinkSupplied = true
    useTeamToken = true
    form.setData({ teamToken: token })
    form.clearErrors()
  })
</script>

<svelte:head>
  {#if clientConfig}
    <title>Login | {clientConfig.ctfName}</title>
  {/if}
</svelte:head>

{#if clientConfig?.isArchived}
  <ArchivedNotice message="Authentication is not available." />
{:else if clientConfig}
  <Card title="Login" description="Log in to {clientConfig.ctfName}">
    <auth-page>
      {#if loginLinkSupplied}
        <p role="status">
          {replacingSession
            ? 'This link contains a team token. Click Login to replace your current session.'
            : 'This link contains a team token. Click Login to confirm that you want to sign in.'}
        </p>
      {/if}
      {#if activeForm.errors._form}
        <p role="alert">{activeForm.errors._form}</p>
      {/if}
      <form onsubmit={handleSubmit}>
        {#if useTeamToken}
          <Field label="Team token" error={form.errors.teamToken}>
            {#snippet children({ id, describedBy })}
              <Input
                {id}
                name="teamToken"
                type="password"
                placeholder="Enter your team token"
                autocomplete="off"
                required
                aria-describedby={describedBy}
                aria-invalid={!!form.errors.teamToken || undefined}
                bind:value={form.data.teamToken}
                oninput={() => form.validateField('teamToken')}
              />
            {/snippet}
          </Field>
        {:else}
          <Field
            label="Team name or email"
            error={passwordForm.errors.identifier}
          >
            {#snippet children({ id, describedBy })}
              <Input
                {id}
                name="identifier"
                type="text"
                placeholder="Enter your team name or email"
                autocomplete="username"
                autocorrect="off"
                required
                aria-describedby={describedBy}
                aria-invalid={!!passwordForm.errors.identifier || undefined}
                bind:value={passwordForm.data.identifier}
              />
            {/snippet}
          </Field>
          <Field label="Password" error={passwordForm.errors.password}>
            {#snippet children({ id, describedBy })}
              <Input
                {id}
                name="password"
                type="password"
                placeholder="Enter your password"
                autocomplete="current-password"
                required
                aria-describedby={describedBy}
                aria-invalid={!!passwordForm.errors.password || undefined}
                bind:value={passwordForm.data.password}
              />
            {/snippet}
          </Field>
        {/if}
        <Button type="submit" disabled={isPending}>
          {#if isPending}
            <Spinner />
          {/if}
          Login
        </Button>
      </form>
      <footer-note>
        <button type="button" onclick={toggleMode}>
          {useTeamToken ? 'Log in with a password' : 'Log in with a team token'}
        </button>
        {#if clientConfig.emailEnabled}
          &middot; <a href="/recover">Lost your team token?</a>
        {/if}
      </footer-note>
      {#if clientConfig.ctftime}
        <auth-divider aria-hidden="true">or</auth-divider>
        <ButtonCtftime
          clientId={clientConfig.ctftime.clientId}
          onCtftimeDone={handleCtftimeDone}
          disabled={isPending}
        />
      {/if}
      {#if clientConfig.registrationsEnabled !== false}
        <footer-note
          >Don't have an account? <a href="/register">Register here</a
          >.</footer-note
        >
      {/if}
      <CaptchaNotice config={clientConfig} action={ProtectedAction.Login} />
    </auth-page>
  </Card>
{/if}
