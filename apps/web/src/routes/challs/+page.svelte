<script lang="ts">
  import { Section } from '$lib'
  import ChallengeGrid from './ChallengeGrid.svelte'

  let { data } = $props()
</script>

<Section title="Challenges">
  {#if data.challenges}
    <ChallengeGrid
      challenges={data.challenges}
      solves={data.user?.solves ?? []}
    />
  {:else if data.error}
    <div role="alert">{data.error}</div>
  {:else}
    <p>You need to be logged in to view challenges.</p>
    <a href="/login">Login</a>
  {/if}
</Section>
