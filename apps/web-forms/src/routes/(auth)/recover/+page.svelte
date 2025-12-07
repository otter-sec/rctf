<script lang="ts">
  import { GoodVerifySent, RecoverRouteV2 } from '@rctf/types'
  import { createApiForm } from '$lib/forms'

  let verifySent = $state(false)
  let submittedEmail = $state('')

  const form = createApiForm({
    route: RecoverRouteV2,
    defaultValues: { email: '' },
    onSuccess: response => {
      if (response.kind === GoodVerifySent.kind) {
        submittedEmail = form.getFieldValue('email')
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
  <form
    onsubmit={e => {
      e.preventDefault()
      e.stopPropagation()
      form.handleSubmit()
    }}>
    <div>
      <form.Field name="email">
        {#snippet children(field)}
          <label for={field.name}>Email</label>
          <input
            id={field.name}
            name={field.name}
            type="email"
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
          {isSubmitting ? 'Sending...' : 'Send Recovery Email'}
        </button>
      {/snippet}
    </form.Subscribe>
  </form>
{/if}

<p><a href="/login">Back to login</a></p>
