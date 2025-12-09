<script lang="ts">
  import { useClientConfig, useLeaderboard } from '$lib/query'

  const configQuery = useClientConfig()
  const config = $derived($configQuery.data)

  let division = $state('open')
  let page = $state(0)
  const limit = 25

  const leaderboardQuery = $derived(useLeaderboard({ limit, offset: page * limit, division }))
  const leaderboard = $derived($leaderboardQuery.data)

  function nextPage() {
    if (leaderboard && leaderboard.leaderboard.length === limit) {
      page++
    }
  }

  function prevPage() {
    if (page > 0) {
      page--
    }
  }

  function getInitials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase()
  }
</script>

<h1>Scores</h1>

{#if config && Object.keys(config.divisions).length > 1}
  <div>
    <label for="division">Division:</label>
    <select id="division" bind:value={division} onchange={() => (page = 0)}>
      {#each Object.entries(config.divisions) as [value, label]}
        <option {value}>{label}</option>
      {/each}
    </select>
  </div>
{/if}

{#if $leaderboardQuery.isPending}
  <p>Loading leaderboard...</p>
{:else if $leaderboardQuery.isError}
  <p style="color: red">Error: {$leaderboardQuery.error.message}</p>
{:else if leaderboard}
  <p>Total teams: {leaderboard.total}</p>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th></th>
        <th>Team</th>
        <th>Score</th>
      </tr>
    </thead>
    <tbody>
      {#each leaderboard.leaderboard as entry, i}
        <tr>
          <td>{page * limit + i + 1}</td>
          <td>
            {#if entry.avatarUrl}
              <img src={entry.avatarUrl} alt={entry.name} width="32" height="32" />
            {:else}
              <span>
                {getInitials(entry.name)}
              </span>
            {/if}
          </td>
          <td>
            <a href="/profile/{entry.id}">{entry.name}</a>
          </td>
          <td>{entry.score}</td>
        </tr>
      {/each}
    </tbody>
  </table>

  <div>
    <button onclick={prevPage} disabled={page === 0}>Previous</button>
    <span>Page {page + 1}</span>
    <button onclick={nextPage} disabled={leaderboard.leaderboard.length < limit}>Next</button>
  </div>
{/if}
