<script lang="ts">
  import { page } from '$app/state'
  import { useUserProfile } from '$lib/query'

  const id = $derived(page.params.id ?? '')
  const profileQuery = $derived(useUserProfile(id))
  const profile = $derived($profileQuery.data)

  function getInitials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase()
  }
</script>

<h1>User Profile</h1>

{#if $profileQuery.isPending}
  <p>Loading...</p>
{:else if $profileQuery.isError}
  <p style="color: red">Error: {$profileQuery.error.message}</p>
{:else if profile}
  <section>
    <div>
      {#if profile.avatarUrl}
        <img src={profile.avatarUrl} alt={profile.name} width="64" height="64" />
      {:else}
        <div>
          {getInitials(profile.name)}
        </div>
      {/if}
      <div>
        <h2>{profile.name}</h2>
        <p>
          {#if profile.divisionPlace}#{profile.divisionPlace} in {profile.division}{:else}{profile.division}{/if}
        </p>
      </div>
    </div>
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
