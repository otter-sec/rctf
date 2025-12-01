<script lang="ts">
  import { Card } from '$lib/components'
  import { useLeaderboardGraph } from '$lib/query'
  import LeaderboardGraph from './leaderboard-graph.svelte'
  import ScoresTable from './scores-table.svelte'

  const graphQuery = useLeaderboardGraph({ limit: 10, division: 'open' })
  const graph = $derived($graphQuery.data)
</script>

<div class="flex flex-col gap-6">
  <ScoresTable />
</div>
