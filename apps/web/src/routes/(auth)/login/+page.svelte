<script lang="ts">
  import { BadUnknownUser, GoodLogin } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { setToken, toast } from '$lib'
  import {
    Button,
    ButtonCtftime,
    ButtonDiscord,
    Card,
    Field,
    Input,
    Spinner,
  } from '$lib/components'
  import { queryKeys, useClientConfig, useLoginMutation } from '$lib/query'
  import { onMount } from 'svelte'

  const queryClient = useQueryClient()
  const loginMutation = useLoginMutation()
  const clientConfigQuery = useClientConfig()

  const clientConfig = $derived($clientConfigQuery.data)

  let teamToken = $state('')
  let errors = $state<Record<string, string>>({})

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
    errors = {}
    $loginMutation.mutate(
      { teamToken: token },
      {
        onSuccess: response => {
          if (response.kind === GoodLogin.kind) {
            handleLoginSuccess(response.data.authToken)
          } else {
            errors = { teamToken: response.message }
          }
        },
        onError: error => {
          errors = { teamToken: error.message }
        },
      }
    )
  }

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    errors = {}

    let token = teamToken
    try {
      const url = new URL(token)
      const urlToken = url.searchParams.get('token')
      if (urlToken) {
        token = urlToken
      }
    } catch {
      // empty
    }

    $loginMutation.mutate(
      { teamToken: token },
      {
        onSuccess: response => {
          if (response.kind === GoodLogin.kind) {
            handleLoginSuccess(response.data.authToken)
          } else {
            errors = { teamToken: response.message }
          }
        },
        onError: error => {
          errors = { teamToken: error.message }
        },
      }
    )
  }

  function handleCtftimeDone(ctftimeData: {
    ctftimeToken: string
    ctftimeName: string
    ctftimeId: string
  }) {
    errors = {}
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

  function handleDiscordDone(discordData: {
    discordToken: string
    discordName: string
    discordId: string
  }) {
    errors = {}
    $loginMutation.mutate(
      { discordToken: discordData.discordToken },
      {
        onSuccess: response => {
          if (response.kind === GoodLogin.kind) {
            handleLoginSuccess(response.data.authToken)
          } else if (response.kind === BadUnknownUser.kind) {
            sessionStorage.setItem('discordToken', discordData.discordToken)
            sessionStorage.setItem('discordName', discordData.discordName)
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
        <Field.Field data-invalid={!!errors.teamToken || undefined}>
          <Field.Label for="teamToken">Team token</Field.Label>
          <Input
            id="teamToken"
            name="teamToken"
            type="password"
            placeholder="Enter your team token"
            autocomplete="current-password"
            required
            bind:value={teamToken}
            aria-invalid={!!errors.teamToken} />
          {#if errors.teamToken}
            <Field.Error>{errors.teamToken}</Field.Error>
          {/if}
        </Field.Field>

        {#if clientConfig.emailEnabled}
          <p class="text-sm">
            <a href="/recover" class="text-foreground-prose-link hover:underline"
              >Lost your team token?</a>
          </p>
        {/if}

        <Button type="submit" disabled={$loginMutation.isPending} class="w-full">
          {#if $loginMutation.isPending}
            <Spinner class="size-4" />
          {/if}
          Login
        </Button>
      </form>

      {#if clientConfig.ctftime}
        <div class="mt-4 flex items-center gap-4">
          <div class="h-px flex-1 bg-border"></div>
          <span class="text-foreground-l3 text-sm">or</span>
          <div class="h-px flex-1 bg-border"></div>
        </div>

        <div class="mt-4">
          <ButtonCtftime
            clientId={clientConfig.ctftime.clientId}
            onCtftimeDone={handleCtftimeDone}
            disabled={$loginMutation.isPending} />
        </div>
      {/if}

      {#if clientConfig.discord}
        <div class="mt-4 flex items-center gap-4">
          <div class="h-px flex-1 bg-border"></div>
          <span class="text-foreground-l3 text-sm">or</span>
          <div class="h-px flex-1 bg-border"></div>
        </div>

        <div class="mt-4">
          <ButtonDiscord
            clientId={clientConfig.discord.clientId}
            onDiscordDone={handleDiscordDone}
            disabled={$loginMutation.isPending}
          />
        </div>
      {/if}
    </Card.Content>
    <Card.Footer>
      <p class="text-foreground-l3 text-sm">
        Don't have an account?
        <a href="/register" class="text-foreground-prose-link hover:underline">Register here</a>.
      </p>
    </Card.Footer>
  </Card.Root>
{/if}
