<script lang="ts">
  import { Section } from '$lib'
  import LeaderboardTable from './LeaderboardTable.svelte'

  let { data } = $props()
</script>

<Section title="Leaderboard">
  <LeaderboardTable
    entries={data.leaderboard.leaderboard}
    total={data.leaderboard.total}
  />
</Section>
