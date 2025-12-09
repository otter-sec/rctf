<script lang="ts">
  import { GoodEmailSet, GoodRegister, GoodVerify } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { setToken } from '$lib/api'
  import { queryKeys, useVerifyMutation } from '$lib/query'
  import { onMount } from 'svelte'

  const queryClient = useQueryClient()
  const verifyMutation = useVerifyMutation()

  let status = $state<'loading' | 'success' | 'error'>('loading')
  let message = $state('')

  onMount(() => {
    const token = page.url.searchParams.get('token')
    if (!token) {
      status = 'error'
      message = 'No verification token provided'
      return
    }

    $verifyMutation.mutate(
      { verifyToken: token },
      {
        onSuccess: response => {
          if (
            response.kind === GoodVerify.kind ||
            response.kind === GoodEmailSet.kind ||
            response.kind === GoodRegister.kind
          ) {
            status = 'success'
            message = response.message

            if (response.kind === GoodRegister.kind) {
              setToken(response.data.authToken)
              queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
              setTimeout(() => goto('/'), 2000)
            }
          } else {
            status = 'error'
            message = response.message
          }
        },
        onError: error => {
          status = 'error'
          message = error.message
        },
      }
    )
  })
</script>

<h1>Verify</h1>

{#if status === 'loading'}
  <p>Verifying...</p>
{:else if status === 'success'}
  <p style="color: green">{message}</p>
  <p><a href="/">Go to home</a></p>
{:else}
  <p style="color: red">{message}</p>
  <p><a href="/login">Back to login</a></p>
{/if}
