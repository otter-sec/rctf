<script lang="ts">
  import { RecoverRoute, GoodVerifySent } from '@rctf/types'
  import { Section, FormField, Button, apiRequest, toast } from '$lib'

  let { data } = $props()

  let email = $state('')
  let loading = $state(false)
  let errors = $state<Record<string, string>>({})
  let verifySent = $state(false)

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    loading = true
    errors = {}

    const response = await apiRequest(RecoverRoute, { email })

    if (response.kind === GoodVerifySent.kind) {
      verifySent = true
      toast.success('Recovery email sent!')
    } else {
      errors = { email: response.message }
    }

    loading = false
  }
</script>

<svelte:head>
  <title>Recover Account | {data.clientConfig.ctfName}</title>
</svelte:head>

{#if verifySent}
  <Section title="Recovery Email Sent">
    <p>
      We've sent a recovery email to <strong>{email}</strong>. Please check your
      inbox and click the link to access your account.
    </p>
    <p class="mt-4">
      Didn't receive the email? Check your spam folder or
      <button type="button" onclick={() => (verifySent = false)}>
        try again </button
      >.
    </p>
  </Section>
{:else}
  <Section
    title="Recover Account"
    description="Get a new team token sent to your email"
  >
    <form onsubmit={handleSubmit} class="flex max-w-md flex-col gap-4">
      <FormField
        label="Email"
        name="email"
        type="email"
        placeholder="Enter your email"
        autocomplete="email"
        required
        bind:value={email}
        error={errors.email}
      />

      <Button type="submit" {loading}>Recover</Button>
    </form>

    <p class="mt-6">
      Remember your token?
      <a href="/login">Login</a>
    </p>
  </Section>
{/if}
