<script lang="ts">
  import { GoodEmailSet, GoodRegister, GoodVerify } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { setToken, toast } from '$lib'
  import { Button, Card, Spinner } from '$lib/components'
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

{#if emailSet}
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-xl">Email verified</Card.Title>
    </Card.Header>
    <Card.Content class="prose">
      <p>Your email has been verified. You can now close this tab.</p>
    </Card.Content>
  </Card.Root>
{:else if verified}
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-xl">Account verified</Card.Title>
    </Card.Header>
    <Card.Content class="prose">
      <p>Your account has been verified. Redirecting you to the home page...</p>
    </Card.Content>
  </Card.Root>
{:else}
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-xl">Verify email</Card.Title>
      <Card.Description>
        Complete your registration by verifying your email address
      </Card.Description>
    </Card.Header>
    <Card.Content>
      {#if error}
        <div
          class="bg-background-destructive text-foreground-destructive mb-4 rounded-md p-3 text-sm"
          role="alert"
        >
          {error}
        </div>
      {/if}

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
    <Card.Footer>
      <p class="text-foreground-l3 text-sm">
        Need help? <a
          href="/login"
          class="text-foreground-prose-link hover:underline">Back to login</a
        >.
      </p>
    </Card.Footer>
  </Card.Root>
{/if}
