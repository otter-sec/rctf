<script lang="ts">
  import { GoodEmailSet, GoodRegister, GoodVerify } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { setToken, toast } from '$lib'
  import { Button, Card, Spinner } from '$lib/components'
  import { IconCircleCheckFilled, IconX } from '$lib/icons'
  import { queryKeys, useVerifyMutation } from '$lib/query'

  let { data } = $props()

  const queryClient = useQueryClient()
  const verifyMutation = useVerifyMutation()

  let error = $state<string | null>(null)
  let emailSet = $state(false)
  let verified = $state(false)

  function handleVerify() {
    const verifyToken = page.url.searchParams.get('token')

    if (!verifyToken) {
      error = 'No verification token provided.'
      return
    }

    error = null

    $verifyMutation.mutate(
      { verifyToken },
      {
        onSuccess: response => {
          if (
            response.kind === GoodVerify.kind ||
            response.kind === GoodRegister.kind
          ) {
            setToken(response.data.authToken)
            verified = true
            toast.success('Verified successfully!')
            queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
            setTimeout(() => goto('/'), 500)
          } else if (response.kind === GoodEmailSet.kind) {
            emailSet = true
            toast.success('Email verified!')
            queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
          } else {
            error = response.message
          }
        },
        onError: err => {
          error = err.message
        },
      }
    )
  }
</script>

<svelte:head>
  <title>Verify | {data.clientConfig.ctfName}</title>
</svelte:head>

<Card.Root>
  {#if error}
    <Card.Header>
      <Card.Title
        class="flex items-center gap-2 text-2xl text-foreground-destructive"
      >
        <IconX class="size-6" />
        Verification failed
      </Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-4">
      <div
        class="bg-background-destructive text-foreground-destructive rounded-md p-3 text-sm"
        role="alert"
      >
        {error}
      </div>
      <Button variant="outline" href="/login">Back to login</Button>
    </Card.Content>
  {:else if emailSet}
    <Card.Header>
      <Card.Title
        class="flex items-center gap-2 text-2xl text-foreground-success"
      >
        <IconCircleCheckFilled class="size-6" />
        Email verified
      </Card.Title>
    </Card.Header>
    <Card.Content>
      <p class="text-foreground-l3">
        Your email has been verified. You can now close this tab.
      </p>
    </Card.Content>
  {:else if verified}
    <Card.Header>
      <Card.Title
        class="flex items-center gap-2 text-2xl text-foreground-success"
      >
        <IconCircleCheckFilled class="size-6" />
        Verified!
      </Card.Title>
    </Card.Header>
    <Card.Content>
      <p class="text-foreground-l3">
        Your account has been verified. Redirecting you to the home page...
      </p>
    </Card.Content>
  {:else}
    <Card.Header>
      <Card.Title class="text-xl">Verify email</Card.Title>
      <Card.Description>
        Complete your registration by verifying your email address
      </Card.Description>
    </Card.Header>
    <Card.Content class="flex flex-col gap-4">
      <p class="text-foreground-l3 text-sm">
        Click the button below to verify your email address.
      </p>
      <Button
        onclick={handleVerify}
        disabled={$verifyMutation.isPending}
        class="w-full"
      >
        {#if $verifyMutation.isPending}
          <Spinner class="size-4" />
        {/if}
        Verify email
      </Button>
    </Card.Content>
  {/if}
</Card.Root>
