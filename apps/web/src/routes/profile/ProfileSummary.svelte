<script lang="ts">
  import { Section, toast } from '$lib'
  import type { UserProfile } from '$lib/api'

  let { user }: { user: UserProfile } = $props()

  let showToken = $state(false)

  async function copyToken() {
    await navigator.clipboard.writeText(user.teamToken)
    toast.success('Team token copied to clipboard!')
  }
</script>

<Section title="Profile">
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-2">
      <h3>{user.name}</h3>
      {#if user.email}
        <p>{user.email}</p>
      {/if}
      {#if user.ctftimeId}
        <p>
          CTFtime ID: <a
            href="https://ctftime.org/team/{user.ctftimeId}"
            target="_blank"
            rel="noopener noreferrer">{user.ctftimeId}</a
          >
        </p>
      {/if}
    </div>

    <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
      <div class="border p-3">
        <p><small>Division</small></p>
        <p>{user.division}</p>
      </div>
      <div class="border p-3">
        <p><small>Score</small></p>
        <p>{user.score.toLocaleString()}</p>
      </div>
      {#if user.globalPlace !== null}
        <div class="border p-3">
          <p><small>Global Rank</small></p>
          <p>#{user.globalPlace}</p>
        </div>
      {/if}
      {#if user.divisionPlace !== null}
        <div class="border p-3">
          <p><small>Division Rank</small></p>
          <p>#{user.divisionPlace}</p>
        </div>
      {/if}
    </div>

    <div class="flex flex-col gap-2">
      <h4>Team Token</h4>
      <p>
        <small
          >Share this token with your teammates so they can login to the same
          account.</small
        >
      </p>
      <div class="flex items-center gap-2">
        <code class="flex-1 overflow-hidden text-ellipsis border p-2">
          {#if showToken}
            {user.teamToken}
          {:else}
            {'•'.repeat(32)}
          {/if}
        </code>
        <button type="button" onclick={() => (showToken = !showToken)}>
          {showToken ? 'Hide' : 'Show'}
        </button>
        <button type="button" onclick={copyToken}>Copy</button>
      </div>
    </div>

    {#if user.solves.length > 0}
      <div class="flex flex-col gap-3">
        <h4>Solves ({user.solves.length})</h4>
        <ul class="flex flex-col gap-2">
          {#each user.solves as solve (solve.id)}
            <li class="flex items-start justify-between gap-4 border p-3">
              <div class="flex flex-col gap-1">
                <p><strong>{solve.name}</strong></p>
                <p>
                  <small>
                    {solve.category} • {new Date(
                      solve.createdAt
                    ).toLocaleString()}
                  </small>
                </p>
              </div>
              {#if solve.points !== null}
                <span>{solve.points} pts</span>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    {:else}
      <p>
        No solves yet. Head over to the
        <a href="/challs">challenges</a> page to get started!
      </p>
    {/if}
  </div>
</Section>
