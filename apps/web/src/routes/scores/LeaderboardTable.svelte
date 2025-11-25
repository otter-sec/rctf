<script lang="ts">
  import type { LeaderboardEntry } from '$lib/api'

  let {
    entries,
    total,
  }: { entries: LeaderboardEntry[]; total: number } = $props()
</script>

<div class="flex flex-col gap-2">
  <p>Showing {entries.length} of {total}</p>
  <ol class="flex flex-col gap-1">
    {#each entries as entry, index (entry.id)}
      <li class="flex items-center gap-4">
        <span>#{index + 1}</span>
        <span class="flex-1">{entry.name}</span>
        <span>{entry.score.toLocaleString()}</span>
      </li>
    {/each}
  </ol>
</div>
