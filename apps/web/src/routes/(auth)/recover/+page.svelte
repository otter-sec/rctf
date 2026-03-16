<script lang="ts">
  import { GoodVerifySent, ProtectedAction, RecoverRouteV2 } from '@rctf/types'
  import { ArchivedNotice, Button, Card, Field, Input, Spinner } from '$lib/components'
  import CaptchaNotice from '$lib/components/captcha-notice.svelte'
  import { useApiForm } from '$lib/forms'
  import { useClientConfig } from '$lib/query'
  import { toast } from 'svelte-sonner'

  const clientConfigQuery = useClientConfig()
  const clientConfig = $derived(clientConfigQuery.data)
  const isArchived = $derived(clientConfig?.isArchived ?? false)

  let verifySent = $state(false)

  const form = useApiForm(RecoverRouteV2, {
    onSuccess: res => {
      if (res.kind === GoodVerifySent.kind) {
        verifySent = true
        toast.success('Recovery email sent!')
      }
    },
  })
</script>

<svelte:head>
  {#if clientConfig}
    <title>Recover account | {clientConfig.ctfName}</title>
  {/if}
</svelte:head>

{#if clientConfig?.isArchived}
  <ArchivedNotice message="Account recovery is not available." />
{:else if verifySent}
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-xl">Recovery email sent</Card.Title>
      <Card.Description>Get a new team token sent to your email</Card.Description>
    </Card.Header>
    <Card.Content class="prose">
      <p>
        If an account exists for <b class="font-medium">{form.data.email}</b>, we've sent a recovery
        email. Please check your inbox and click the link to access your account. If you didn't
        receive the email, check your spam folder or
        <button
          class="text-foreground-prose-link cursor-pointer hover:underline"
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
      <form onsubmit={form.submit} class="flex flex-col gap-4">
        <Field.Field data-invalid={!!form.errors.email || !!form.errors._form || undefined}>
          <Field.Label for="email">Email</Field.Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="Enter your email"
            autocomplete="email"
            required
            bind:value={form.data.email}
            aria-invalid={!!form.errors.email || !!form.errors._form}
          />
          {#if form.errors.email}
            <Field.Error>{form.errors.email}</Field.Error>
          {/if}
          {#if form.errors._form}
            <Field.Error>{form.errors._form}</Field.Error>
          {/if}
        </Field.Field>

        <Button type="submit" disabled={form.submitting} class="w-full">
          {#if form.submitting}
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
