<script lang="ts">
  import { GoodRegister, GoodVerifySent, RegisterRouteV2 } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { setToken } from '$lib/api'
  import { useMutationForm, required, email, name, compose } from '$lib/forms'
  import { queryKeys } from '$lib/query'

  const queryClient = useQueryClient()

  let verifySent = $state(false)

  const form = useMutationForm({
    route: RegisterRouteV2,
    initial: { name: '', email: '' },
    validators: {
      name: compose(required, name),
      email: compose(required, email),
    },
    onSuccess: response => {
      if (response.kind === GoodRegister.kind) {
        setToken(response.data.authToken)
        queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
        goto('/')
      } else if (response.kind === GoodVerifySent.kind) {
        verifySent = true
      }
    },
  })
</script>

<h1>Register</h1>

{#if verifySent}
  <p>Verification email sent to <strong>{form.values.email}</strong></p>
  <p>Check your inbox and click the link to complete registration.</p>
  <button onclick={() => (verifySent = false)}>Try again</button>
{:else}
  <form onsubmit={form.handleSubmit}>
    <div>
      <label for="name">Team Name</label>
      <input
        id="name"
        type="text"
        value={form.values.name}
        oninput={e => form.setValue('name', e.currentTarget.value)}
        onblur={() => form.setTouched('name')}
        minlength={2}
        maxlength={64}
        required />
      {#if form.errors.name && form.touched.name}
        <span style="color: red">{form.errors.name}</span>
      {/if}
    </div>

    <div>
      <label for="email">Email</label>
      <input
        id="email"
        type="email"
        value={form.values.email}
        oninput={e => form.setValue('email', e.currentTarget.value)}
        onblur={() => form.setTouched('email')}
        required />
      {#if form.errors.email && form.touched.email}
        <span style="color: red">{form.errors.email}</span>
      {/if}
    </div>

    <button type="submit" disabled={form.isPending}>
      {form.isPending ? 'Registering...' : 'Register'}
    </button>
  </form>
{/if}

<p><a href="/login">Already have an account?</a></p>
