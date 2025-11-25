<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation'
  import { page } from '$app/state'
  import {
    VerifyRoute,
    GoodVerify,
    GoodRegister,
    GoodEmailSet,
  } from '@rctf/types'
  import { Section, Button, apiRequest, setToken, toast } from '$lib'

  let { data } = $props()

  let loading = $state(false)
  let error = $state<string | null>(null)
  let emailSet = $state(false)
  let verified = $state(false)

  async function handleVerify() {
    const verifyToken = page.url.searchParams.get('token')

    if (!verifyToken) {
      error = 'No verification token provided.'
      return
    }

    loading = true
    error = null

    const response = await apiRequest(VerifyRoute, { verifyToken })

    if (
      response.kind === GoodVerify.kind ||
      response.kind === GoodRegister.kind
    ) {
      setToken(response.data.authToken)
      verified = true
      toast.success('Verified successfully!')
      await invalidateAll()
      // Redirect after a short delay
      setTimeout(() => goto('/'), 2000)
    } else if (response.kind === GoodEmailSet.kind) {
      emailSet = true
      toast.success('Email verified!')
    } else {
      error = response.message
    }

    loading = false
  }
</script>

<svelte:head>
  <title>Verify | {data.clientConfig.ctfName}</title>
</svelte:head>

{#if error}
  <Section title="Verification Failed">
    <div role="alert">{error}</div>
    <p class="mt-4">
      <a href="/login">Back to login</a>
    </p>
  </Section>
{:else if emailSet}
  <Section title="Email Verified">
    <p>Your email has been verified. You can now close this tab.</p>
  </Section>
{:else if verified}
  <Section title="Verified!">
    <p>Your account has been verified. Redirecting you to the home page...</p>
  </Section>
{:else}
  <Section title="Verify Email">
    <p class="mb-4">Click the button below to verify your email address.</p>
    <Button onclick={handleVerify} {loading}>Verify Email</Button>
  </Section>
{/if}
