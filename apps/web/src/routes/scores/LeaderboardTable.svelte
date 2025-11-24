<script lang="ts">
  import type { LeaderboardEntry } from '$lib/api'

  let { entries, total }: { entries: LeaderboardEntry[]; total: number } = $props()
</script>

<div class="flex flex-col gap-2">
  <div class="flex items-center justify-between">
    <span>Showing {entries.length} of {total}</span>
  </div>
  <div class="flex flex-col gap-1">
    {#each entries as entry, index (entry.id)}
      <div class="grid grid-cols-[3rem_1fr_auto] gap-4 border p-3 items-center">
        <span>#{index + 1}</span>
        <span>{entry.name}</span>
        <span>{entry.score.toLocaleString()}</span>
      </div>
    {/each}
  </div>
</div>
