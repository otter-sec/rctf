<script lang="ts">
  import { Section } from '$lib'
  import ProfileSummary from './ProfileSummary.svelte'

  let { data } = $props()
</script>

{#if data.user}
  <ProfileSummary user={data.user} />
{:else}
  <Section title="Profile">
    <p>You need to be logged in to view your profile.</p>
    <a href="/login">Login</a>
  </Section>
{/if}
