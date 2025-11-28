<script lang="ts">
  import { GoodLogin, GoodRegister, GoodVerifySent } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { setToken, toast } from '$lib'
  import {
    Button,
    Card,
    ButtonCtftime,
    Field,
    Input,
    Spinner,
  } from '$lib/components'
  import { queryKeys, useLoginMutation, useRegisterMutation } from '$lib/query'
  import { onMount } from 'svelte'

  let { data } = $props()

  const queryClient = useQueryClient()
  const registerMutation = useRegisterMutation()
  const loginMutation = useLoginMutation()

  let name = $state('')
  let email = $state('')
  let errors = $state<Record<string, string>>({})
  let verifySent = $state(false)

  let ctftimeToken = $state<string | null>(null)
  let ctftimeName = $state<string | null>(null)

  const loading = $derived(
    $registerMutation.isPending || $loginMutation.isPending
  )

  onMount(() => {
    const storedToken = sessionStorage.getItem('ctftimeToken')
    const storedName = sessionStorage.getItem('ctftimeName')

    if (storedToken && storedName) {
      ctftimeToken = storedToken
      ctftimeName = storedName
      name = storedName
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
    errors = {}

    if (ctftimeToken) {
      $registerMutation.mutate(
        { name, ctftimeToken },
        {
          onSuccess: response => {
            if (response.kind === GoodRegister.kind) {
              handleRegisterSuccess(response.data.authToken)
            } else {
              const msg = response.message
              if (msg.toLowerCase().includes('name')) {
                errors = { name: msg }
              } else {
                errors = { form: msg }
              }
            }
          },
          onError: error => {
            errors = { form: error.message }
          },
        }
      )
      return
    }

    $registerMutation.mutate(
      { name, email },
      {
        onSuccess: response => {
          if (response.kind === GoodRegister.kind) {
            handleRegisterSuccess(response.data.authToken)
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
        },
        onError: error => {
          errors = { form: error.message }
        },
      }
    )
  }

  function handleCtftimeDone(ctftimeData: {
    ctftimeToken: string
    ctftimeName: string
    ctftimeId: string
  }) {
    errors = {}

    $loginMutation.mutate(
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
            name = ctftimeData.ctftimeName
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
    name = ''
  }
</script>

<svelte:head>
  <title>Register | {data.clientConfig.ctfName}</title>
</svelte:head>

{#if verifySent}
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-xl">Verification email sent</Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-4">
      <p>
        We've sent a verification email to <strong>{email}</strong>. Please
        check your inbox and click the link to complete registration.
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
{:else if ctftimeToken}
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-xl">Complete Registration</Card.Title>
      <Card.Description>Registering with CTFtime</Card.Description>
    </Card.Header>
    <Card.Content>
      {#if errors.form}
        <div
          class="bg-background-destructive text-foreground-destructive mb-4 rounded-md p-3 text-sm"
          role="alert"
        >
          {errors.form}
        </div>
      {/if}

      <form onsubmit={handleSubmit} class="flex flex-col gap-4">
        <Field.Field data-invalid={!!errors.name || undefined}>
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
            bind:value={name}
            aria-invalid={!!errors.name}
          />
          <Field.Description>
            You can use a different name than your CTFtime team name.
          </Field.Description>
          {#if errors.name}
            <Field.Error>{errors.name}</Field.Error>
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
      <Button variant="ghost" onclick={cancelCtftime} class="text-sm">
        Cancel and register with email instead
      </Button>
    </Card.Footer>
  </Card.Root>
{:else}
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-xl">Register</Card.Title>
      <Card.Description>
        Create an account for {data.clientConfig.ctfName}
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <p class="text-foreground-l3 mb-4 text-sm">
        Please register one account per team.
      </p>

      {#if errors.form}
        <div
          class="bg-background-destructive text-foreground-destructive mb-4 rounded-md p-3 text-sm"
          role="alert"
        >
          {errors.form}
        </div>
      {/if}

      <form onsubmit={handleSubmit} class="flex flex-col gap-4">
        <Field.Field data-invalid={!!errors.name || undefined}>
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

      {#if data.clientConfig.ctftime}
        <div class="mt-4 flex items-center gap-4">
          <div class="h-px flex-1 bg-border"></div>
          <span class="text-foreground-l3 text-sm">or</span>
          <div class="h-px flex-1 bg-border"></div>
        </div>

        <div class="mt-4">
          <ButtonCtftime
            clientId={data.clientConfig.ctftime.clientId}
            onCtftimeDone={handleCtftimeDone}
            disabled={loading}
          />
        </div>
      {/if}
    </Card.Content>
    <Card.Footer>
      <p class="text-foreground-l3 text-sm">
        Already have an account?
        <a href="/login" class="text-foreground-prose-link hover:underline"
          >Login</a
        >
      </p>
    </Card.Footer>
  </Card.Root>
{/if}
