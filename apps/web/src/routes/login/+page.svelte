<script lang="ts">
  import { BadUnknownUser, GoodLogin, LoginRoute } from '@rctf/types'
  import { goto, invalidateAll } from '$app/navigation'
  import { page } from '$app/state'
  import { apiRequest, setToken, toast } from '$lib'
  import {
    Button,
    Card,
    CtftimeButton,
    Field,
    Input,
    Spinner,
  } from '$lib/components'
  import { onMount } from 'svelte'

  let { data } = $props()

  let teamToken = $state('')
  let loading = $state(false)
  let errors = $state<Record<string, string>>({})

  onMount(() => {
    const urlToken = page.url.searchParams.get('token')
    if (urlToken) {
      handleTokenLogin(urlToken)
    }
  })

  async function handleTokenLogin(token: string) {
    loading = true
    errors = {}

    const response = await apiRequest(LoginRoute, { teamToken: token })

    if (response.kind === GoodLogin.kind) {
      setToken(response.data.authToken)
      toast.success('Logged in successfully!')
      await invalidateAll()
      goto('/')
    } else {
      errors = { teamToken: response.message }
      loading = false
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    loading = true
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

    const response = await apiRequest(LoginRoute, { teamToken: token })

    if (response.kind === GoodLogin.kind) {
      setToken(response.data.authToken)
      toast.success('Logged in successfully!')
      await invalidateAll()
      goto('/')
    } else {
      errors = { teamToken: response.message }
    }

    loading = false
  }

  async function handleCtftimeDone(ctftimeData: {
    ctftimeToken: string
    ctftimeName: string
    ctftimeId: string
  }) {
    loading = true
    errors = {}

    const response = await apiRequest(LoginRoute, {
      ctftimeToken: ctftimeData.ctftimeToken,
    })

    if (response.kind === GoodLogin.kind) {
      setToken(response.data.authToken)
      toast.success('Logged in successfully!')
      await invalidateAll()
      goto('/')
    } else if (response.kind === BadUnknownUser.kind) {
      sessionStorage.setItem('ctftimeToken', ctftimeData.ctftimeToken)
      sessionStorage.setItem('ctftimeName', ctftimeData.ctftimeName)
      goto('/register')
    } else {
      toast.error(response.message)
    }

    loading = false
  }
</script>

<svelte:head>
  <title>Login | {data.clientConfig.ctfName}</title>
</svelte:head>

<Card.Root>
  <Card.Header>
    <Card.Title class="text-xl">Login</Card.Title>
    <Card.Description>Log in to {data.clientConfig.ctfName}</Card.Description>
  </Card.Header>
  <Card.Content>
    <form onsubmit={handleSubmit} class="flex flex-col gap-4">
      <Field.Field data-invalid={!!errors.teamToken || undefined}>
        <Field.Label for="teamToken">Team token</Field.Label>
        <Input
          id="teamToken"
          name="teamToken"
          type="text"
          placeholder="Enter your team token"
          autocomplete="off"
          autocorrect="off"
          required
          bind:value={teamToken}
          aria-invalid={!!errors.teamToken}
        />
        {#if errors.teamToken}
          <Field.Error>{errors.teamToken}</Field.Error>
        {/if}
      </Field.Field>

      {#if data.clientConfig.emailEnabled}
        <p class="text-sm">
          <a href="/recover" class="text-foreground-prose-link hover:underline"
            >Lost your team token?</a
          >
        </p>
      {/if}

      <Button type="submit" disabled={loading} class="w-full">
        {#if loading}
          <Spinner class="size-4" />
        {/if}
        Login
      </Button>
    </form>

    {#if data.clientConfig.ctftime}
      <div class="mt-4 flex items-center gap-4">
        <div class="h-px flex-1 bg-border"></div>
        <span class="text-foreground-l3 text-sm">or</span>
        <div class="h-px flex-1 bg-border"></div>
      </div>

      <div class="mt-4">
        <CtftimeButton
          clientId={data.clientConfig.ctftime.clientId}
          onCtftimeDone={handleCtftimeDone}
          disabled={loading}
        />
      </div>
    {/if}
  </Card.Content>
  <Card.Footer>
    <p class="text-foreground-l3 text-sm">
      Don't have an account?
      <a href="/register" class="text-foreground-prose-link hover:underline"
        >Register</a
      >
    </p>
  </Card.Footer>
</Card.Root>
