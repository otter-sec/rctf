<script lang="ts">
  import {
    GoodLogin,
    GoodRegister,
    GoodVerifySent,
    ProtectedAction,
    RegisterRouteV2,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { setToken } from '$lib/api'
  import { Button, Card, Field, Input, Spinner } from '$lib/components'
  import CaptchaNotice from '$lib/components/captcha-notice.svelte'
  import { useApiForm } from '$lib/forms'
  import { queryKeys, useClientConfig, useLoginMutation } from '$lib/query'
  import { onMount } from 'svelte'
  import { toast } from 'svelte-sonner'
  import ButtonCtftime from '../button-ctftime.svelte'

  const queryClient = useQueryClient()
  const loginMutation = useLoginMutation()
  const clientConfigQuery = useClientConfig()

  const clientConfig = $derived(clientConfigQuery.data)

  let verifySent = $state(false)
  let ctftimeToken = $state<string | null>(null)
  let ctftimeName = $state<string | null>(null)

  const form = useApiForm(RegisterRouteV2, {
    onSuccess: res => {
      if (res.kind === GoodRegister.kind) {
        handleRegisterSuccess(res.data.authToken)
      } else if (res.kind === GoodVerifySent.kind) {
        verifySent = true
      }
    },
  })

  const isPending = $derived(form.submitting || loginMutation.isPending)

  onMount(() => {
    const storedToken = sessionStorage.getItem('ctftimeToken')
    const storedName = sessionStorage.getItem('ctftimeName')

    if (storedToken && storedName) {
      ctftimeToken = storedToken
      ctftimeName = storedName
      form.setData({ name: storedName, ctftimeToken: storedToken })
      sessionStorage.removeItem('ctftimeToken')
      sessionStorage.removeItem('ctftimeName')
    }
  })

  function handleRegisterSuccess(authToken: string) {
    setToken(authToken)
    toast.success('Account created successfully!')
    queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
    goto('/')
  }

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault()

    if (ctftimeToken) {
      form.setData({ ctftimeToken })
    }

    form.submit()
  }

  function handleCtftimeDone(ctftimeData: {
    ctftimeToken: string
    ctftimeName: string
    ctftimeId: string
  }) {
    form.clearErrors()

    loginMutation.mutate(
      { ctftimeToken: ctftimeData.ctftimeToken },
      {
        onSuccess: response => {
          if (response.kind === GoodLogin.kind) {
            setToken(response.data.authToken)
            toast.success('Logged in successfully!')
            queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
            goto('/')
          } else {
            ctftimeToken = ctftimeData.ctftimeToken
            ctftimeName = ctftimeData.ctftimeName
            form.setData({ name: ctftimeData.ctftimeName, ctftimeToken: ctftimeData.ctftimeToken })
          }
        },
        onError: error => {
          toast.error(error.message)
        },
      }
    )
  }

  function cancelCtftime() {
    ctftimeToken = null
    ctftimeName = null
    form.reset()
  }
</script>

<svelte:head>
  {#if clientConfig}
    <title>Register | {clientConfig.ctfName}</title>
  {/if}
</svelte:head>

{#if clientConfig}
  {#if verifySent}
    <Card.Root>
      <Card.Header>
        <Card.Title class="text-xl">Verification email sent</Card.Title>
        <Card.Description>Check your inbox to complete registration</Card.Description>
      </Card.Header>
      <Card.Content class="prose">
        <p>
          We've sent a verification email to <b class="font-medium">{form.data.email}</b>. Please
          check your inbox and click the link to complete registration. If you didn't receive the
          email, check your spam folder or
          <button
            class="text-foreground-prose-link cursor-pointer hover:underline"
            onclick={() => (verifySent = false)}>try again</button
          >.
        </p>
      </Card.Content>
    </Card.Root>
  {:else if ctftimeToken}
    <Card.Root>
      <Card.Header>
        <Card.Title class="text-xl">Complete registration</Card.Title>
        <Card.Description>Registering with CTFtime</Card.Description>
      </Card.Header>
      <Card.Content>
        {#if form.errors._form}
          <div
            class="bg-background-destructive text-foreground-destructive mb-4 rounded-md p-3 text-sm"
            role="alert"
          >
            {form.errors._form}
          </div>
        {/if}

        <form onsubmit={handleSubmit} class="flex flex-col gap-4">
          <Field.Field data-invalid={!!form.errors.name || undefined}>
            <Field.Label for="name">Team name</Field.Label>
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
              bind:value={form.data.name}
              aria-invalid={!!form.errors.name}
              oninput={() => form.validateField('name')}
            />
            <Field.Description
              >You can use a different name than your CTFtime team name.</Field.Description
            >
            {#if form.errors.name}
              <Field.Error>{form.errors.name}</Field.Error>
            {/if}
          </Field.Field>

          <Button type="submit" disabled={isPending} class="w-full">
            {#if isPending}
              <Spinner class="size-4" />
            {/if}
            Register
          </Button>
        </form>
      </Card.Content>
      <Card.Footer>
        <p class="text-foreground-l3 text-sm">
          Changed your mind? <a href="/register" class="text-foreground-prose-link hover:underline"
            >Register with email instead</a
          >.
        </p>
      </Card.Footer>
    </Card.Root>
  {:else}
    <Card.Root>
      <Card.Header>
        <Card.Title class="text-xl">Register</Card.Title>
        <Card.Description>
          Create an account for {clientConfig.ctfName}
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <p class="text-foreground-l3 mb-4 text-sm">Please register only one account per team.</p>

        {#if form.errors._form}
          <div
            class="bg-background-destructive text-foreground-destructive mb-4 rounded-md p-3 text-sm"
            role="alert"
          >
            {form.errors._form}
          </div>
        {/if}

        <form onsubmit={handleSubmit} class="flex flex-col gap-4">
          <Field.Field data-invalid={!!form.errors.name || undefined}>
            <Field.Label for="name">Team name</Field.Label>
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
              bind:value={form.data.name}
              aria-invalid={!!form.errors.name}
              oninput={() => form.validateField('name')}
            />
            {#if form.errors.name}
              <Field.Error>{form.errors.name}</Field.Error>
            {/if}
          </Field.Field>

          <Field.Field data-invalid={!!form.errors.email || undefined}>
            <Field.Label for="email">Email</Field.Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              autocomplete="email"
              required
              bind:value={form.data.email}
              aria-invalid={!!form.errors.email}
              oninput={() => form.validateField('email')}
            />
            {#if form.errors.email}
              <Field.Error>{form.errors.email}</Field.Error>
            {/if}
          </Field.Field>

          <Button type="submit" disabled={isPending} class="w-full">
            {#if isPending}
              <Spinner class="size-4" />
            {/if}
            Register
          </Button>
        </form>

        {#if clientConfig.ctftime}
          <div class="mt-4 flex items-center gap-4">
            <div class="bg-border h-px flex-1"></div>
            <span class="text-foreground-l3 text-sm">or</span>
            <div class="bg-border h-px flex-1"></div>
          </div>

          <div class="mt-4">
            <ButtonCtftime
              clientId={clientConfig.ctftime.clientId}
              onCtftimeDone={handleCtftimeDone}
              disabled={isPending}
            />
          </div>
        {/if}
      </Card.Content>
      <Card.Footer class="flex flex-col gap-2">
        <p class="text-foreground-l3 text-sm">
          Already have an account? <a
            href="/login"
            class="text-foreground-prose-link hover:underline">Login here</a
          >.
        </p>
        <CaptchaNotice config={clientConfig} action={ProtectedAction.Register} class="mt-3" />
      </Card.Footer>
    </Card.Root>
  {/if}
{/if}
