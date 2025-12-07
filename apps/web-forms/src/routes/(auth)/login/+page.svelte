<script lang="ts">
  import { GoodLogin, LoginRoute } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { setToken } from '$lib/api'
  import { useApiForm } from '$lib/forms'
  import { queryKeys } from '$lib/query'

  const queryClient = useQueryClient()

  const form = useApiForm(LoginRoute, {
    defaults: { teamToken: '' },
    onSuccess: response => {
      if (response.kind === GoodLogin.kind) {
        setToken(response.data.authToken)
        queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
        goto('/')
      }
    },
  })
</script>

<h1>Login</h1>

<form onsubmit={form.submit}>
  <div>
    <label for="teamToken">Team Token</label>
    <input id="teamToken" name="teamToken" type="password" bind:value={form.data.teamToken} />
    {#if form.errors.teamToken}
      <em role="alert">{form.errors.teamToken}</em>
    {/if}
  </div>

  {#if form.errors._form}
    <p style="color: red">{form.errors._form}</p>
  {/if}

  <button type="submit" disabled={form.submitting}>
    {form.submitting ? 'Logging in...' : 'Login'}
  </button>
</form>

<p>
  <a href="/register">Register</a> |
  <a href="/recover">Forgot token?</a>
</p>
