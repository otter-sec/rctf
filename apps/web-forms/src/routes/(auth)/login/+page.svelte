<script lang="ts">
  import { GoodLogin, LoginRoute } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { setToken } from '$lib/api'
  import { required, useMutationForm } from '$lib/forms'
  import { queryKeys } from '$lib/query'

  const queryClient = useQueryClient()

  const form = useMutationForm({
    route: LoginRoute,
    initial: { teamToken: '' },
    validators: { teamToken: required },
    fieldMapping: { token: 'teamToken' },
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

<form onsubmit={form.handleSubmit}>
  <div>
    <label for="teamToken">Team Token</label>
    <input
      id="teamToken"
      type="password"
      value={form.values.teamToken}
      oninput={e => form.setValue('teamToken', e.currentTarget.value)}
      onblur={() => form.setTouched('teamToken')}
      required />
    {#if form.errors.teamToken && form.touched.teamToken}
      <span style="color: red">{form.errors.teamToken}</span>
    {/if}
  </div>

  <button type="submit" disabled={form.isPending}>
    {form.isPending ? 'Logging in...' : 'Login'}
  </button>
</form>

<p>
  <a href="/register">Register</a> |
  <a href="/recover">Forgot token?</a>
</p>
