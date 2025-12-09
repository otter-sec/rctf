<script lang="ts">
  import { GoodVerifySent, RecoverRouteV2 } from '@rctf/types'
  import { useApiForm } from '$lib/forms'

  let verifySent = $state<string | null>(null)

  const form = useApiForm(RecoverRouteV2, {
    onSuccess: res => {
      if (res.kind === GoodVerifySent.kind) verifySent = form.data.email
    },
  })
</script>

<h1>Recover Account</h1>

{#if verifySent}
  <p>Recovery email sent to <strong>{verifySent}</strong>. Check your inbox.</p>
  <button onclick={() => (verifySent = null)}>Try again</button>
{:else}
  <form onsubmit={form.submit}>
    <label>Email <input type="email" bind:value={form.data.email} /></label>

    {#if form.errors.email}
      <em>{form.errors.email}</em>
    {/if}

    {#if form.errors._form}
      <p style="color:red">{form.errors._form}</p>
    {/if}

    <button disabled={form.submitting}
      >{form.submitting ? 'Sending...' : 'Send Recovery Email'}</button
    >
  </form>
{/if}

<p><a href="/login">Back to login</a></p>
