<script lang="ts">
  import { GoodLogin, LoginRoute } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { setToken } from '$lib/api'
  import { createApiForm } from '$lib/forms'
  import { queryKeys } from '$lib/query'

  const queryClient = useQueryClient()

  const form = createApiForm({
    route: LoginRoute,
    defaultValues: { teamToken: '' },
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

<form
  onsubmit={e => {
    e.preventDefault()
    e.stopPropagation()
    form.handleSubmit()
  }}>
  <div>
    <form.Field name="teamToken">
      {#snippet children(field)}
        <label for={field.name}>Team Token</label>
        <input
          id={field.name}
          name={field.name}
          type="password"
          value={field.state.value}
          oninput={e => field.handleChange(e.currentTarget.value)}
          onblur={field.handleBlur}
          required />
        {#if field.state.meta.errors.length > 0}
          <span style="color: red">{field.state.meta.errors.map(e => e.message).join(', ')}</span>
        {/if}
      {/snippet}
    </form.Field>
  </div>

  <form.Subscribe selector={state => state.errorMap.onSubmit}>
    {#snippet children(error)}
      {#if error}
        <p style="color: red">{error}</p>
      {/if}
    {/snippet}
  </form.Subscribe>

  <form.Subscribe selector={state => [state.canSubmit, state.isSubmitting]}>
    {#snippet children([canSubmit, isSubmitting])}
      <button type="submit" disabled={!canSubmit}>
        {isSubmitting ? 'Logging in...' : 'Login'}
      </button>
    {/snippet}
  </form.Subscribe>
</form>

<p>
  <a href="/register">Register</a> |
  <a href="/recover">Forgot token?</a>
</p>
