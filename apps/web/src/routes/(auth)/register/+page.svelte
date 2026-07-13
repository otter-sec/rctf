<script lang="ts">
  import {
    GoodLogin,
    GoodRegisterV2,
    GoodVerifySent,
    LoginRoute,
    ProtectedAction,
    RegisterRouteV2,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { apiRequest, setToken } from '$lib/api'
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
  import { buildLoginUrl } from '$lib/utils/auth'
  import { onMount } from 'svelte'
  import ButtonCtftime from '../button-ctftime.svelte'
  import TeamTokenCard from '../team-token-card.svelte'

  const queryClient = useQueryClient()
  const configQuery = useClientConfig()
  const clientConfig = $derived(configQuery.data)

  let verifySent = $state(false)
  let ctftimeToken = $state<string | null>(null)
  let registeredTeamToken = $state<string | null>(null)
  let registeredLoginUrl = $state<string | null>(null)
  const ctftimeLoginAction = createAsyncAction()

  const form = useApiForm(RegisterRouteV2, {
    onSuccess: response => {
      if (response.kind === GoodRegisterV2.kind) {
        handleRegisterSuccess(response.data.authToken, response.data.teamToken)
      } else if (response.kind === GoodVerifySent.kind) {
        verifySent = true
      }
    },
  })

  const isPending = $derived(form.submitting || ctftimeLoginAction.pending)

  function handleRegisterSuccess(authToken: string, teamToken: string) {
    setToken(authToken)
    registeredTeamToken = teamToken
    registeredLoginUrl = buildLoginUrl(teamToken)
    toast.success('Account created successfully!')
    queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    if (ctftimeToken) {
      form.setData({ ctftimeToken })
    }
    form.submit()
  }

  async function handleCtftimeDone(data: {
    ctftimeToken: string
    ctftimeName: string
  }) {
    form.clearErrors()
    await ctftimeLoginAction.run(
      async () => {
        const response = await apiRequest(LoginRoute, {
          ctftimeToken: data.ctftimeToken,
        })
        if (response.kind === GoodLogin.kind) {
          setToken(response.data.authToken)
          toast.success('Logged in successfully!')
          queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
          goto('/')
        } else {
          ctftimeToken = data.ctftimeToken
          form.setData({
            name: data.ctftimeName,
            ctftimeToken: data.ctftimeToken,
          })
        }
      },
      { errorMessage: 'CTFtime login failed' }
    )
  }

  function cancelCtftime() {
    ctftimeToken = null
    form.reset()
  }

  onMount(() => {
    const storedToken = sessionStorage.getItem('ctftimeToken')
    const storedName = sessionStorage.getItem('ctftimeName')

    if (storedToken && storedName) {
      ctftimeToken = storedToken
      form.setData({ name: storedName, ctftimeToken: storedToken })
      sessionStorage.removeItem('ctftimeToken')
      sessionStorage.removeItem('ctftimeName')
    }
  })
</script>

<svelte:head>
  {#if clientConfig}
    <title>Register | {clientConfig.ctfName}</title>
  {/if}
</svelte:head>

{#if clientConfig?.isArchived}
  <ArchivedNotice message="Registration is not available." />
{:else if clientConfig}
  {#if registeredTeamToken && registeredLoginUrl}
    <TeamTokenCard
      teamToken={registeredTeamToken}
      loginUrl={registeredLoginUrl}
    />
  {:else if verifySent}
    <Card
      title="Verification email sent"
      description="Check your inbox to complete registration"
    >
      <auth-page>
        <p>
          We've sent a verification email to <strong>{form.data.email}</strong>.
          Please check your inbox and click the link to complete registration.
          If you didn't receive the email, check your spam folder or
          <button type="button" onclick={() => (verifySent = false)}
            >try again</button
          >.
        </p>
      </auth-page>
    </Card>
  {:else if ctftimeToken}
    <Card title="Complete registration" description="Registering with CTFtime">
      <auth-page>
        {#if form.errors._form}
          <p role="alert">{form.errors._form}</p>
        {/if}
        <form onsubmit={handleSubmit}>
          <Field
            label="Team name"
            description="You can use a different name than your CTFtime team name."
            error={form.errors.name}
          >
            {#snippet children({ id, describedBy })}
              <Input
                {id}
                name="name"
                type="text"
                placeholder="Enter your team name"
                autocomplete="username"
                autocorrect="off"
                minlength={2}
                maxlength={64}
                required
                aria-describedby={describedBy}
                aria-invalid={!!form.errors.name || undefined}
                bind:value={form.data.name}
                oninput={() => form.validateField('name')}
              />
            {/snippet}
          </Field>
          <Button type="submit" disabled={isPending}>
            {#if isPending}
              <Spinner />
            {/if}
            Register
          </Button>
        </form>
        <footer-note>
          Changed your mind?
          <button type="button" onclick={cancelCtftime}
            >Register with email instead</button
          >.
        </footer-note>
      </auth-page>
    </Card>
  {:else}
    <Card
      title="Register"
      description="Create an account for {clientConfig.ctfName}"
    >
      <auth-page>
        <p>Please register only one account per team.</p>
        {#if form.errors._form}
          <p role="alert">{form.errors._form}</p>
        {/if}
        <form onsubmit={handleSubmit}>
          <Field label="Team name" error={form.errors.name}>
            {#snippet children({ id, describedBy })}
              <Input
                {id}
                name="name"
                type="text"
                placeholder="Enter your team name"
                autocomplete="username"
                autocorrect="off"
                minlength={2}
                maxlength={64}
                required
                aria-describedby={describedBy}
                aria-invalid={!!form.errors.name || undefined}
                bind:value={form.data.name}
                oninput={() => form.validateField('name')}
              />
            {/snippet}
          </Field>
          <Field label="Email" error={form.errors.email}>
            {#snippet children({ id, describedBy })}
              <Input
                {id}
                name="email"
                type="email"
                placeholder="Enter your email"
                autocomplete="email"
                required
                aria-describedby={describedBy}
                aria-invalid={!!form.errors.email || undefined}
                bind:value={form.data.email}
                oninput={() => form.validateField('email')}
              />
            {/snippet}
          </Field>
          <Button type="submit" disabled={isPending}>
            {#if isPending}
              <Spinner />
            {/if}
            Register
          </Button>
        </form>
        {#if clientConfig.ctftime}
          <auth-divider aria-hidden="true">or</auth-divider>
          <ButtonCtftime
            clientId={clientConfig.ctftime.clientId}
            onCtftimeDone={handleCtftimeDone}
            disabled={isPending}
          />
        {/if}
        <footer-note
          >Already have an account? <a href="/login">Login here</a
          >.</footer-note
        >
        <CaptchaNotice
          config={clientConfig}
          action={ProtectedAction.Register}
        />
      </auth-page>
    </Card>
  {/if}
{/if}
