<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation'
  import { page } from '$app/state'
  import { LoginRoute, GoodLogin } from '@rctf/types'
  import { Section, FormField, Button, apiRequest, setToken, toast } from '$lib'

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

<Section title="Login" description="Log in to {data.clientConfig.ctfName}">
  <form onsubmit={handleSubmit} class="flex max-w-md flex-col gap-4">
    <FormField
      label="Team Token"
      name="teamToken"
      type="text"
      placeholder="Enter your team token"
      autocomplete="off"
      autocorrect="off"
      required
      bind:value={teamToken}
      error={errors.teamToken}
    />

    {#if data.clientConfig.emailEnabled}
      <p>
        <a href="/recover">Lost your team token?</a>
      </p>
    {/if}

    <Button type="submit" {loading}>Login</Button>
  </form>

  <p class="mt-6">
    Don't have an account?
    <a href="/register">Register</a>
  </p>
</Section>
