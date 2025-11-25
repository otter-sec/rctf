<script lang="ts">
  import { GoodVerifySent, RecoverRoute } from '@rctf/types'
  import { apiRequest, toast } from '$lib'
  import { Button, Card, Field, Input, Spinner } from '$lib/components'

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
  <title>Recover account | {data.clientConfig.ctfName}</title>
</svelte:head>

{#if verifySent}
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-2xl">Recovery email sent</Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-4">
      <p>
        We've sent a recovery email to <strong>{email}</strong>. Please check
        your inbox and click the link to access your account.
      </p>
      <p class="text-foreground-l3 text-sm">
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
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-2xl">Recover account</Card.Title>
      <Card.Description>
        Get a new team token sent to your email
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <form onsubmit={handleSubmit} class="flex flex-col gap-4">
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
          Recover
        </Button>
      </form>
    </Card.Content>
    <Card.Footer>
      <p class="text-foreground-l3 text-sm">
        Remember your token?
        <a href="/login" class="text-foreground-prose-link hover:underline"
          >Login</a
        >
      </p>
    </Card.Footer>
  </Card.Root>
{/if}
