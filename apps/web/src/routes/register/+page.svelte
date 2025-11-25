<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation'
  import { RegisterRoute, GoodRegister, GoodVerifySent } from '@rctf/types'
  import { Section, FormField, Button, apiRequest, setToken, toast } from '$lib'

  let { data } = $props()

  let name = $state('')
  let email = $state('')
  let loading = $state(false)
  let errors = $state<Record<string, string>>({})
  let verifySent = $state(false)

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    loading = true
    errors = {}

    const response = await apiRequest(RegisterRoute, { name, email })

    if (response.kind === GoodRegister.kind) {
      setToken(response.data.authToken)
      toast.success('Account created successfully!')
      await invalidateAll()
      goto('/')
    } else if (response.kind === GoodVerifySent.kind) {
      verifySent = true
    } else {
      const msg = response.message
      if (msg.toLowerCase().includes('email')) {
        errors = { email: msg }
      } else if (msg.toLowerCase().includes('name')) {
        errors = { name: msg }
      } else {
        errors = { form: msg }
      }
    }

    loading = false
  }
</script>

<svelte:head>
  <title>Register | {data.clientConfig.ctfName}</title>
</svelte:head>

{#if verifySent}
  <Section title="Verification Email Sent">
    <p>
      We've sent a verification email to <strong>{email}</strong>. Please check
      your inbox and click the link to complete registration.
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
    title="Register"
    description="Create an account for {data.clientConfig.ctfName}"
  >
    <p class="mb-4">Please register one account per team.</p>

    {#if errors.form}
      <div class="mb-4" role="alert">{errors.form}</div>
    {/if}

    <form onsubmit={handleSubmit} class="flex max-w-md flex-col gap-4">
      <FormField
        label="Team Name"
        name="name"
        type="text"
        placeholder="Enter your team name"
        autocomplete="username"
        autocorrect="off"
        minlength={2}
        maxlength={64}
        required
        bind:value={name}
        error={errors.name}
      />

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

      <Button type="submit" {loading}>Register</Button>
    </form>

    <p class="mt-6">
      Already have an account?
      <a href="/login">Login</a>
    </p>
  </Section>
{/if}
