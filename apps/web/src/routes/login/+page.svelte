<script lang="ts">
  import { GoodLogin, LoginRoute } from '@rctf/types'
  import { goto, invalidateAll } from '$app/navigation'
  import { page } from '$app/state'
  import { apiRequest, setToken, toast } from '$lib'
  import { Button, Card, Field, Input, Spinner } from '$lib/components'

  let { data } = $props()

  let teamToken = $state('')
  let loading = $state(false)
  let errors = $state<Record<string, string>>({})

  $effect(() => {
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
      // Not a URL, use as-is
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
</script>

<svelte:head>
  <title>Login | {data.clientConfig.ctfName}</title>
</svelte:head>

<Card.Root class="mx-auto max-w-md">
  <Card.Header>
    <Card.Title class="text-2xl">Login</Card.Title>
    <Card.Description>Log in to {data.clientConfig.ctfName}</Card.Description>
  </Card.Header>
  <Card.Content>
    <form onsubmit={handleSubmit} class="flex flex-col gap-4">
      <Field.Field data-invalid={!!errors.teamToken || undefined}>
        <Field.Label for="teamToken">Team Token</Field.Label>
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
          <a href="/recover" class="text-primary hover:underline"
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
  </Card.Content>
  <Card.Footer>
    <p class="text-muted-foreground text-sm">
      Don't have an account?
      <a href="/register" class="text-primary hover:underline">Register</a>
    </p>
  </Card.Footer>
</Card.Root>
