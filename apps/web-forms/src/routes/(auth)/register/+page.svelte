<script lang="ts">
  import { GoodRegister, GoodVerifySent, RegisterRouteV2 } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { setToken } from '$lib/api'
  import { useApiForm } from '$lib/forms'
  import { queryKeys } from '$lib/query'

  const queryClient = useQueryClient()
  let verifySent = $state<string | null>(null)

  const form = useApiForm(RegisterRouteV2, {
    onSuccess: res => {
      if (res.kind === GoodRegister.kind) {
        setToken(res.data.authToken)
        queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
        goto('/')
      } else if (res.kind === GoodVerifySent.kind) {
        verifySent = form.data.email ?? ''
      }
    },
  })
</script>

<h1>Register</h1>

{#if verifySent}
  <p>Verification email sent to <strong>{verifySent}</strong>. Check your inbox.</p>
  <button onclick={() => (verifySent = null)}>Try again</button>
{:else}
  <form onsubmit={form.submit}>
    <label
      >Team Name <input
        type="text"
        bind:value={form.data.name}
        oninput={() => form.validateField('name')} /></label>
    {#if form.errors.name}
      <em style="color: red">{form.errors.name}</em>
    {/if}

    <label
      >Email <input
        type="email"
        bind:value={form.data.email}
        oninput={() => form.validateField('email')} /></label>
    {#if form.errors.email}
      <em style="color: red">{form.errors.email}</em>
    {/if}

    {#if form.errors._form}
      <p style="color:red">{form.errors._form}</p>
    {/if}

    <button disabled={form.submitting}>{form.submitting ? 'Registering...' : 'Register'}</button>
  </form>
{/if}

<p><a href="/login">Already have an account?</a></p>
