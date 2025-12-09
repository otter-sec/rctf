<script lang="ts">
  import { GoodCtftimeToken } from '@rctf/types'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { useCtftimeCallbackMutation } from '$lib/query'
  import { onMount } from 'svelte'

  const callbackMutation = useCtftimeCallbackMutation()

  let status = $state<'loading' | 'success' | 'error'>('loading')
  let message = $state('')
  let ctftimeData = $state<{ token: string; name: string; id: string } | null>(null)

  onMount(() => {
    const code = page.url.searchParams.get('code')
    const state = page.url.searchParams.get('state')

    if (!code) {
      status = 'error'
      message = 'No authorization code provided'
      return
    }

    $callbackMutation.mutate(
      { ctftimeCode: code },
      {
        onSuccess: response => {
          if (response.kind === GoodCtftimeToken.kind) {
            status = 'success'
            ctftimeData = {
              token: response.data.ctftimeToken,
              name: response.data.ctftimeName,
              id: response.data.ctftimeId,
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

  function continueToLogin() {
    if (ctftimeData) {
      sessionStorage.setItem('ctftimeToken', ctftimeData.token)
      sessionStorage.setItem('ctftimeName', ctftimeData.name)
      goto('/login')
    }
  }

  function continueToRegister() {
    if (ctftimeData) {
      sessionStorage.setItem('ctftimeToken', ctftimeData.token)
      sessionStorage.setItem('ctftimeName', ctftimeData.name)
      goto('/register')
    }
  }
</script>

<h1>CTFtime Callback</h1>

{#if status === 'loading'}
  <p>Processing CTFtime authorization...</p>
{:else if status === 'error'}
  <p style="color: red">{message}</p>
  <p><a href="/login">Back to login</a></p>
{:else if ctftimeData}
  <p>Authenticated as: <strong>{ctftimeData.name}</strong></p>
  <p>CTFtime ID: {ctftimeData.id}</p>

  <div>
    <button onclick={continueToLogin}>Login with existing account</button>
    <button onclick={continueToRegister}>Register new account</button>
  </div>
{/if}
