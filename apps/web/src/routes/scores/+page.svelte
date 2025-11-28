<script lang="ts">
  import { Card } from '$lib/components'
  import { useLeaderboardGraph } from '$lib/query'
  import LeaderboardGraph from './leaderboard-graph.svelte'
  import LeaderboardTable from './leaderboard-table.svelte'

  const graphQuery = useLeaderboardGraph({ limit: 10, division: 'open' })
  const graph = $derived($graphQuery.data)
</script>

<div class="flex flex-col gap-6">
  {#if graph && graph.length > 0}
    <Card.Root>
      <Card.Header>
        <Card.Title class="text-xl">Score progression</Card.Title>
        <Card.Description>Top 10 teams over time</Card.Description>
      </Card.Header>
      <Card.Content>
        <LeaderboardGraph />
      </Card.Content>
    </Card.Root>
  {/if}

  <Card.Root>
    <Card.Header>
      <Card.Title class="text-xl">Leaderboard</Card.Title>
    </Card.Header>
    <Card.Content>
      <LeaderboardTable />
    </Card.Content>
  </Card.Root>
</div>
