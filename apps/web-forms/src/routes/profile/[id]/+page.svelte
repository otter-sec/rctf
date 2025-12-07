<script lang="ts">
  import { page } from '$app/state'
  import { useUserProfile } from '$lib/query'

  const id = $derived(page.params.id ?? '')
  const profileQuery = $derived(useUserProfile(id))
  const profile = $derived($profileQuery.data)
</script>

<h1>User Profile</h1>

{#if $profileQuery.isPending}
  <p>Loading...</p>
{:else if $profileQuery.isError}
  <p style="color: red">Error: {$profileQuery.error.message}</p>
{:else if profile}
  <section>
    <h2>{profile.name}</h2>
    <p>Division: {profile.division}</p>
    <p>Score: {profile.score}</p>
    <p>Solves: {profile.solves.length}</p>
  </section>

  {#if profile.solves.length > 0}
    <section>
      <h3>Solves</h3>
      <ul>
        {#each profile.solves as solve}
          <li>
            {solve.name} ({solve.category}) - {solve.points} pts
            <small>at {new Date(solve.createdAt).toLocaleString()}</small>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
{:else}
  <p>User not found.</p>
{/if}

<p><a href="/scores">Back to scores</a></p>
