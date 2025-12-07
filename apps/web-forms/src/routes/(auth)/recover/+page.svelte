<script lang="ts">
  import { GoodVerifySent, RecoverRouteV2 } from '@rctf/types'
  import { useApiForm } from '$lib/forms'

  let verifySent = $state(false)
  let submittedEmail = $state('')

  const form = useApiForm(RecoverRouteV2, {
    defaults: { email: '' },
    onSuccess: response => {
      if (response.kind === GoodVerifySent.kind) {
        submittedEmail = form.data.email
        verifySent = true
      }
    },
  })
</script>

<h1>Recover Account</h1>

{#if verifySent}
  <p>Recovery email sent to <strong>{submittedEmail}</strong></p>
  <p>Check your inbox for your team token.</p>
  <button onclick={() => (verifySent = false)}>Try again</button>
{:else}
  <form onsubmit={form.submit}>
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
      {form.submitting ? 'Sending...' : 'Send Recovery Email'}
    </button>
  </form>
{/if}

<p><a href="/login">Back to login</a></p>
