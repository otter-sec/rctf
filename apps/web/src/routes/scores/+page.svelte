<script lang="ts">
  import { Card } from '$lib/components'
  import LeaderboardGraph from './leaderboard-graph.svelte'
  import LeaderboardTable from './leaderboard-table.svelte'

  let { data } = $props()
</script>

<div class="flex flex-col gap-6">
  {#if data.graph && data.graph.length > 0}
    <Card.Root>
      <Card.Header>
        <Card.Title class="text-2xl">Score progression</Card.Title>
        <Card.Description>Top 10 teams over time</Card.Description>
      </Card.Header>
      <Card.Content>
        <LeaderboardGraph graph={data.graph} />
      </Card.Content>
    </Card.Root>
  {/if}

  <Card.Root>
    <Card.Header>
      <Card.Title class="text-2xl">Leaderboard</Card.Title>
    </Card.Header>
    <Card.Content>
      {#if data.leaderboard}
        <LeaderboardTable
          entries={data.leaderboard.leaderboard}
          total={data.leaderboard.total}
        />
      {:else if data.error}
        <div
          class="bg-background-destructive text-foreground-destructive rounded-md p-3 text-sm"
          role="alert"
        >
          {data.error}
        </div>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
