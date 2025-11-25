<script lang="ts">
  import { Section } from '$lib'
  import LeaderboardTable from './LeaderboardTable.svelte'

  let { data } = $props()
</script>

<Section title="Leaderboard">
  {#if data.leaderboard}
    <LeaderboardTable
      entries={data.leaderboard.leaderboard}
      total={data.leaderboard.total}
    />
  {:else if data.error}
    <div role="alert">{data.error}</div>
  {/if}
</Section>
