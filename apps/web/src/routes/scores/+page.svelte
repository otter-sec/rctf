<script lang="ts">
  import * as Card from '$lib/components/ui/card'
  import LeaderboardTable from './LeaderboardTable.svelte'

  let { data } = $props()
</script>

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
        class="bg-destructive/10 text-destructive rounded-md p-3 text-sm"
        role="alert"
      >
        {data.error}
      </div>
    {/if}
  </Card.Content>
</Card.Root>
