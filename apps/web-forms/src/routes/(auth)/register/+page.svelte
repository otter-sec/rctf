<script lang="ts">
  import { GoodRegister, GoodVerifySent, RegisterRouteV2, UserEmail, UserName } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { setToken } from '$lib/api'
  import { createApiForm } from '$lib/forms'
  import { queryKeys } from '$lib/query'

  const queryClient = useQueryClient()

  let verifySent = $state(false)
  let submittedEmail = $state('')

  const form = createApiForm({
    route: RegisterRouteV2,
    defaultValues: { name: '', email: '' },
    onSuccess: response => {
      if (response.kind === GoodRegister.kind) {
        setToken(response.data.authToken)
        queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
        goto('/')
      } else if (response.kind === GoodVerifySent.kind) {
        submittedEmail = form.getFieldValue('email')
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
  <form
    onsubmit={e => {
      e.preventDefault()
      e.stopPropagation()
      form.handleSubmit()
    }}>
    <div>
      <form.Field name="name" validators={{ onChange: UserName }}>
        {#snippet children(field)}
          <label for={field.name}>Team Name</label>
          <input
            id={field.name}
            name={field.name}
            type="text"
            value={field.state.value}
            oninput={e => field.handleChange(e.currentTarget.value)}
            onblur={field.handleBlur} />
          {#if field.state.meta.errors}
            <em role="alert">{field.state.meta.errors.map(e => e.message).join(', ')}</em>
          {/if}
        {/snippet}
      </form.Field>
    </div>

    <div>
      <form.Field name="email" validators={{ onChange: UserEmail }}>
        {#snippet children(field)}
          <label for={field.name}>Email</label>
          <input
            id={field.name}
            name={field.name}
            type="email"
            value={field.state.value}
            oninput={e => field.handleChange(e.currentTarget.value)}
            onblur={field.handleBlur} />
          {#if field.state.meta.errors}
            <em role="alert">{field.state.meta.errors.map(e => e.message).join(', ')}</em>
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
          {isSubmitting ? 'Registering...' : 'Register'}
        </button>
      {/snippet}
    </form.Subscribe>
  </form>
{/if}

<p><a href="/login">Already have an account?</a></p>
