<script lang="ts">
  import type { LeaderboardEntry } from '$lib/api'
  import * as Table from '$lib/components/ui/table'

  let { entries, total }: { entries: LeaderboardEntry[]; total: number } =
    $props()
</script>

<div class="flex flex-col gap-4">
  <p class="text-muted-foreground text-sm">
    Showing {entries.length} of {total} teams
  </p>

  <Table.Root>
    <Table.Header>
      <Table.Row>
        <Table.Head class="w-16">Rank</Table.Head>
        <Table.Head>Team</Table.Head>
        <Table.Head class="text-right">Score</Table.Head>
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {#each entries as entry, index (entry.id)}
        <Table.Row>
          <Table.Cell class="text-muted-foreground tabular-nums">
            #{index + 1}
          </Table.Cell>
          <Table.Cell class="font-medium">
            <a href="/profile/{entry.id}" class="hover:underline">
              {entry.name}
            </a>
          </Table.Cell>
          <Table.Cell class="text-right tabular-nums">
            {entry.score.toLocaleString()}
          </Table.Cell>
        </Table.Row>
      {/each}
    </Table.Body>
  </Table.Root>
</div>
