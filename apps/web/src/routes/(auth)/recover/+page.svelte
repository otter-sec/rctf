<script lang="ts">
  import { GoodVerifySent, ProtectedAction } from '@rctf/types'
  import { toast } from '$lib'
  import { Button, Card, Field, Input, Spinner } from '$lib/components'
  import CaptchaNotice from '$lib/components/captcha-notice.svelte'
  import { useClientConfig, useRecoverMutation } from '$lib/query'

  const recoverMutation = useRecoverMutation()
  const clientConfigQuery = useClientConfig()

  const clientConfig = $derived($clientConfigQuery.data)

  let email = $state('')
  let errors = $state<Record<string, string>>({})
  let verifySent = $state(false)

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    errors = {}

    $recoverMutation.mutate(
      { email },
      {
        onSuccess: response => {
          if (response.kind === GoodVerifySent.kind) {
            verifySent = true
            toast.success('Recovery email sent!')
          } else {
            errors = { email: response.message }
          }
        },
        onError: error => {
          errors = { email: error.message }
        },
      }
    )
  }
</script>

<svelte:head>
  {#if clientConfig}
    <title>Recover account | {clientConfig.ctfName}</title>
  {/if}
</svelte:head>

{#if verifySent}
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-xl">Recovery email sent</Card.Title>
      <Card.Description>Get a new team token sent to your email</Card.Description>
    </Card.Header>
    <Card.Content class="prose">
      <p>
        We've sent a recovery email to <b class="font-medium">{email}</b>. Please check your inbox
        and click the link to access your account. If you didn't receive the email, check your spam
        folder or
        <button
          class="text-foreground-prose-link hover:underline cursor-pointer"
          onclick={() => (verifySent = false)}>try again</button
        >.
      </p>
    </Card.Content>
  </Card.Root>
{:else}
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-xl">Recover account</Card.Title>
      <Card.Description>Get a new team token sent to your email</Card.Description>
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
            aria-invalid={!!errors.email} />
          {#if errors.email}
            <Field.Error>{errors.email}</Field.Error>
          {/if}
        </Field.Field>

        <Button type="submit" disabled={$recoverMutation.isPending} class="w-full">
          {#if $recoverMutation.isPending}
            <Spinner class="size-4" />
          {/if}
          Recover
        </Button>
      </form>
    </Card.Content>
    <Card.Footer class="flex flex-col gap-2">
      <p class="text-foreground-l3 text-sm">
        Remember your token? <a href="/login" class="text-foreground-prose-link hover:underline"
          >Login here</a
        >.
      </p>
      <CaptchaNotice config={clientConfig} action={ProtectedAction.Recover} class="mt-3" />
    </Card.Footer>
  </Card.Root>
{/if}
