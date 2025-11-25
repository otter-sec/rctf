<script lang="ts">
  import { GoodRegister, GoodVerifySent, RegisterRoute } from '@rctf/types'
  import { goto, invalidateAll } from '$app/navigation'
  import { apiRequest, setToken, toast } from '$lib'
  import { Button, Card, Field, Input, Spinner } from '$lib/components'

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
  <Card.Root class="mx-auto max-w-md">
    <Card.Header>
      <Card.Title class="text-2xl">Verification Email Sent</Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-4">
      <p>
        We've sent a verification email to <strong>{email}</strong>. Please
        check your inbox and click the link to complete registration.
      </p>
      <p class="text-muted-foreground text-sm">
        Didn't receive the email? Check your spam folder or
        <Button
          variant="link"
          class="h-auto p-0"
          onclick={() => (verifySent = false)}
        >
          try again
        </Button>.
      </p>
    </Card.Content>
  </Card.Root>
{:else}
  <Card.Root class="mx-auto max-w-md">
    <Card.Header>
      <Card.Title class="text-2xl">Register</Card.Title>
      <Card.Description>
        Create an account for {data.clientConfig.ctfName}
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <p class="text-muted-foreground mb-4 text-sm">
        Please register one account per team.
      </p>

      {#if errors.form}
        <div
          class="bg-destructive/10 text-destructive mb-4 rounded-md p-3 text-sm"
          role="alert"
        >
          {errors.form}
        </div>
      {/if}

      <form onsubmit={handleSubmit} class="flex flex-col gap-4">
        <Field.Field data-invalid={!!errors.name || undefined}>
          <Field.Label for="name">Team Name</Field.Label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Enter your team name"
            autocomplete="username"
            autocorrect="off"
            minlength={2}
            maxlength={64}
            required
            bind:value={name}
            aria-invalid={!!errors.name}
          />
          {#if errors.name}
            <Field.Error>{errors.name}</Field.Error>
          {/if}
        </Field.Field>

        <Field.Field data-invalid={!!errors.email || undefined}>
          <Field.Label for="email">Email</Field.Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="Enter your email"
            autocomplete="email"
            required
            bind:value={email}
            aria-invalid={!!errors.email}
          />
          {#if errors.email}
            <Field.Error>{errors.email}</Field.Error>
          {/if}
        </Field.Field>

        <Button type="submit" disabled={loading} class="w-full">
          {#if loading}
            <Spinner class="size-4" />
          {/if}
          Register
        </Button>
      </form>
    </Card.Content>
    <Card.Footer>
      <p class="text-muted-foreground text-sm">
        Already have an account?
        <a href="/login" class="text-primary hover:underline">Login</a>
      </p>
    </Card.Footer>
  </Card.Root>
{/if}
