<script lang="ts">
  import { GoodVerifySent, RecoverRouteV2 } from '@rctf/types'
  import { useMutationForm, required, email, compose } from '$lib/forms'

  let verifySent = $state(false)

  const form = useMutationForm({
    route: RecoverRouteV2,
    initial: { email: '' },
    validators: { email: compose(required, email) },
    onSuccess: response => {
      if (response.kind === GoodVerifySent.kind) {
        verifySent = true
      }
    },
  })
</script>

<h1>Recover Account</h1>

{#if verifySent}
  <p>Recovery email sent to <strong>{form.values.email}</strong></p>
  <p>Check your inbox for your team token.</p>
  <button onclick={() => (verifySent = false)}>Try again</button>
{:else}
  <form onsubmit={form.handleSubmit}>
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
      {form.isPending ? 'Sending...' : 'Send Recovery Email'}
    </button>
  </form>
{/if}

<p><a href="/login">Back to login</a></p>
