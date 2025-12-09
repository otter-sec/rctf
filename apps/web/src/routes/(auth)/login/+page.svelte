<script lang="ts">
  import { BadUnknownUser, GoodLogin, LoginRoute } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { setToken, toast } from '$lib'
  import { Button, Card, Field, Input, Spinner } from '$lib/components'
  import { useApiForm } from '$lib/forms'
  import { queryKeys, useClientConfig, useLoginMutation } from '$lib/query'
  import { onMount } from 'svelte'
  import ButtonCtftime from '../button-ctftime.svelte'

  const queryClient = useQueryClient()
  const loginMutation = useLoginMutation()
  const clientConfigQuery = useClientConfig()

  const clientConfig = $derived($clientConfigQuery.data)

  const form = useApiForm(LoginRoute, {
    onSuccess: res => {
      if (res.kind === GoodLogin.kind) {
        handleLoginSuccess(res.data.authToken)
      }
    },
  })

  onMount(() => {
    const urlToken = page.url.searchParams.get('token')
    if (urlToken) {
      handleTokenLogin(urlToken)
    }
  })

  function handleLoginSuccess(authToken: string) {
    setToken(authToken)
    toast.success('Logged in successfully!')
    queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
    goto('/')
  }

  function handleTokenLogin(token: string) {
    $loginMutation.mutate(
      { teamToken: token },
      {
        onSuccess: response => {
          if (response.kind === GoodLogin.kind) {
            handleLoginSuccess(response.data.authToken)
          } else {
            form.data = { teamToken: token }
            form.clearErrors()
          }
        },
      }
    )
  }

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault()

    let token = form.data.teamToken ?? ''
    try {
      const url = new URL(token)
      const urlToken = url.searchParams.get('token')
      if (urlToken) {
        token = urlToken
        form.setData({ teamToken: token })
      }
    } catch {}

    form.submit()
  }

  function handleCtftimeDone(ctftimeData: {
    ctftimeToken: string
    ctftimeName: string
    ctftimeId: string
  }) {
    $loginMutation.mutate(
      { ctftimeToken: ctftimeData.ctftimeToken },
      {
        onSuccess: response => {
          if (response.kind === GoodLogin.kind) {
            handleLoginSuccess(response.data.authToken)
          } else if (response.kind === BadUnknownUser.kind) {
            sessionStorage.setItem('ctftimeToken', ctftimeData.ctftimeToken)
            sessionStorage.setItem('ctftimeName', ctftimeData.ctftimeName)
            goto('/register')
          } else {
            toast.error(response.message)
          }
        },
        onError: error => {
          toast.error(error.message)
        },
      }
    )
  }

  const isPending = $derived(form.submitting || $loginMutation.isPending)
</script>

<svelte:head>
  {#if clientConfig}
    <title>Login | {clientConfig.ctfName}</title>
  {/if}
</svelte:head>

{#if clientConfig}
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-xl">Login</Card.Title>
      <Card.Description>Log in to {clientConfig.ctfName}</Card.Description>
    </Card.Header>
    <Card.Content>
      <form onsubmit={handleSubmit} class="flex flex-col gap-4">
        <Field.Field data-invalid={!!form.errors.teamToken || !!form.errors._form || undefined}>
          <Field.Label for="teamToken">Team token</Field.Label>
          <Input
            id="teamToken"
            name="teamToken"
            type="password"
            placeholder="Enter your team token"
            autocomplete="current-password"
            required
            bind:value={form.data.teamToken}
            aria-invalid={!!form.errors.teamToken || !!form.errors._form}
            oninput={() => form.validateField('teamToken')}
          />
          {#if form.errors.teamToken}
            <Field.Error>{form.errors.teamToken}</Field.Error>
          {/if}
          {#if form.errors._form}
            <Field.Error>{form.errors._form}</Field.Error>
          {/if}
        </Field.Field>

        {#if clientConfig.emailEnabled}
          <p class="text-sm">
            <a href="/recover" class="text-foreground-prose-link hover:underline"
              >Lost your team token?</a
            >
          </p>
        {/if}

        <Button type="submit" disabled={isPending} class="w-full">
          {#if isPending}
            <Spinner class="size-4" />
          {/if}
          Login
        </Button>
      </form>

      {#if clientConfig.ctftime}
        <div class="mt-4 flex items-center gap-4">
          <div class="bg-border h-px flex-1"></div>
          <span class="text-foreground-l3 text-sm">or</span>
          <div class="bg-border h-px flex-1"></div>
        </div>

        <div class="mt-4">
          <ButtonCtftime
            clientId={clientConfig.ctftime.clientId}
            onCtftimeDone={handleCtftimeDone}
            disabled={isPending}
          />
        </div>
      {/if}
    </Card.Content>
    <Card.Footer class="flex flex-col gap-2">
      <p class="text-foreground-l3 text-sm">
        Don't have an account?
        <a href="/register" class="text-foreground-prose-link hover:underline">Register here</a>.
      </p>
    </Card.Footer>
  </Card.Root>
{/if}
