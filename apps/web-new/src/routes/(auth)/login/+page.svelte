<script lang="ts">
  import { BadUnknownUser, GoodLogin, LoginRoute } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { apiRequest, setToken, showApiError } from '$lib/api'
  import ArchivedNotice from '$lib/components/archived-notice.svelte'
  import { useApiForm } from '$lib/forms/use-api-form.svelte'
  import { useClientConfig } from '$lib/query/config'
  import { queryKeys } from '$lib/query/keys'
  import { toast } from '$lib/toast'
  import Button from '$lib/ui/button.svelte'
  import Card from '$lib/ui/card.svelte'
  import Field from '$lib/ui/field.svelte'
  import Input from '$lib/ui/input.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import { getRedirectPath } from '$lib/utils/redirect'
  import { onMount } from 'svelte'
  import ButtonCtftime from '../button-ctftime.svelte'

  const queryClient = useQueryClient()
  const configQuery = useClientConfig()
  const clientConfig = $derived(configQuery.data)

  const form = useApiForm(LoginRoute, {
    onSuccess: response => handleLoginSuccess(response.data.authToken),
  })

  let mutationPending = $state(false)
  const isPending = $derived(form.submitting || mutationPending)

  function handleLoginSuccess(authToken: string, replace = false) {
    setToken(authToken)
    toast.success('Logged in successfully!')
    queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
    goto(getRedirectPath(page.url.searchParams.get('next'), page.url.origin), {
      replaceState: replace,
    })
  }

  async function loginWithUrlToken(token: string) {
    mutationPending = true
    try {
      const response = await apiRequest(LoginRoute, { teamToken: token })
      if (response.kind === GoodLogin.kind) {
        // replaceState so back-navigation doesn't land on /login?token= and
        // re-trigger the auto-login
        handleLoginSuccess(response.data.authToken, true)
      } else {
        form.setData({ teamToken: token })
        form.clearErrors()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed')
      form.setData({ teamToken: token })
    } finally {
      mutationPending = false
    }
  }

  async function handleCtftimeDone(data: { ctftimeToken: string; ctftimeName: string }) {
    mutationPending = true
    try {
      const response = await apiRequest(LoginRoute, { ctftimeToken: data.ctftimeToken })
      if (response.kind === GoodLogin.kind) {
        handleLoginSuccess(response.data.authToken)
      } else if (response.kind === BadUnknownUser.kind) {
        sessionStorage.setItem('ctftimeToken', data.ctftimeToken)
        sessionStorage.setItem('ctftimeName', data.ctftimeName)
        goto('/register')
      } else {
        showApiError(response)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed')
    } finally {
      mutationPending = false
    }
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    const value = form.data.teamToken ?? ''
    try {
      const url = new URL(value)
      const urlToken = url.searchParams.get('token')
      if (urlToken) {
        form.setData({ teamToken: urlToken })
      }
    } catch {
      // not a pasted URL — submit the value as-is
    }
    form.submit()
  }

  onMount(() => {
    const urlToken = page.url.searchParams.get('token')
    if (urlToken) {
      loginWithUrlToken(urlToken)
    }
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
      <form onsubmit={handleSubmit}>
        <Field label="Team token" error={form.errors.teamToken ?? form.errors._form}>
          {#snippet children({ id, describedBy })}
            <Input
              {id}
              name="teamToken"
              type="password"
              placeholder="Enter your team token"
              autocomplete="current-password"
              required
              aria-describedby={describedBy}
              aria-invalid={!!form.errors.teamToken || !!form.errors._form || undefined}
              bind:value={form.data.teamToken}
              oninput={() => form.validateField('teamToken')}
            />
          {/snippet}
        </Field>
        {#if clientConfig.emailEnabled}
          <p><a href="/recover">Lost your team token?</a></p>
        {/if}
        <Button type="submit" disabled={isPending}>
          {#if isPending}
            <Spinner />
          {/if}
          Login
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
      <footer-note>Don't have an account? <a href="/register">Register here</a>.</footer-note>
    </auth-page>
  </Card>
{/if}

<style>
  auth-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  form {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);

    p {
      font-size: var(--step--1);

      a {
        --underline: currentColor;

        color: var(--foreground-prose-link);
      }
    }

    :global(button[type='submit']) {
      inline-size: 100%;
    }
  }

  auth-divider {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    font-size: var(--step--1);
    color: var(--foreground-l3);

    &::before,
    &::after {
      flex: 1;
      content: '';
      border-block-start: 1px solid var(--border);
    }
  }

  footer-note {
    display: block;
    font-size: var(--step--1);
    color: var(--foreground-l3);
    text-align: center;

    a {
      --underline: currentColor;

      color: var(--foreground-prose-link);
    }
  }
</style>
