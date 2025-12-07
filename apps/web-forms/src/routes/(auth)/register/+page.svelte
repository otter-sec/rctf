<script lang="ts">
  import { GoodRegister, GoodVerifySent, RegisterRouteV2 } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { setToken } from '$lib/api'
  import { useApiForm } from '$lib/forms'
  import { queryKeys } from '$lib/query'

  const queryClient = useQueryClient()

  let verifySent = $state(false)
  let submittedEmail = $state('')

  const form = useApiForm(RegisterRouteV2, {
    defaults: { name: '', email: '' },
    onSuccess: response => {
      if (response.kind === GoodRegister.kind) {
        setToken(response.data.authToken)
        queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
        goto('/')
      } else if (response.kind === GoodVerifySent.kind) {
        submittedEmail = form.data.email ?? ''
        verifySent = true
      }
    },
  })
</script>

<h1>Register</h1>

{#if verifySent}
  <p>Verification email sent to <strong>{submittedEmail}</strong></p>
  <p>Check your inbox and click the link to complete registration.</p>
  <button onclick={() => (verifySent = false)}>Try again</button>
{:else}
  <form onsubmit={form.submit}>
    <div>
      <label for="name">Team Name</label>
      <input id="name" name="name" type="text" bind:value={form.data.name} />
      {#if form.errors.name}
        <em role="alert">{form.errors.name}</em>
      {/if}
    </div>

    <div>
      <label for="email">Email</label>
      <input id="email" name="email" type="email" bind:value={form.data.email} />
      {#if form.errors.email}
        <em role="alert">{form.errors.email}</em>
      {/if}
    </div>

    {#if form.errors._form}
      <p style="color: red">{form.errors._form}</p>
    {/if}

    <button type="submit" disabled={form.submitting}>
      {form.submitting ? 'Registering...' : 'Register'}
    </button>
  </form>
{/if}

<p><a href="/login">Already have an account?</a></p>
