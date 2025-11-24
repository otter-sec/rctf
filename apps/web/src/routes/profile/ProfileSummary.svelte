<script lang="ts">
  import { Section } from '$lib'
  import type { UserProfile } from '$lib/api'

  let { user }: { user: UserProfile } = $props()
</script>

<Section title="Profile">
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-1">
      <p>{user.name}</p>
      {#if user.email}
        <p>{user.email}</p>
      {/if}
      <div class="flex gap-4">
        <span>{user.division}</span>
        <span>Score {user.score.toLocaleString()}</span>
        {#if user.globalPlace !== null}
          <span>#{user.globalPlace} globally</span>
        {/if}
        {#if user.divisionPlace !== null}
          <span>#{user.divisionPlace} in division</span>
        {/if}
      </div>
    </div>

    {#if user.solves.length > 0}
      <div class="flex flex-col gap-2">
        <h3>Solves ({user.solves.length})</h3>
        <div class="flex flex-col gap-2">
          {#each user.solves as solve (solve.id)}
            <div class="border p-3 flex items-start justify-between gap-4">
              <div class="flex flex-col gap-1">
                <p>{solve.name}</p>
                <p>{solve.category}</p>
                <p>{new Date(solve.createdAt).toLocaleString()}</p>
              </div>
              {#if solve.points !== null}
                <span>{solve.points} pts</span>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <p>No solves recorded.</p>
    {/if}
  </div>
</Section>
