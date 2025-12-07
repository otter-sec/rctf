<script lang="ts">
  import { GoodFlag, SubmitFlagRoute, type Challenge } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { useApiForm } from '$lib/forms'
  import { queryKeys, useChallenges, useCurrentUser } from '$lib/query'

  const queryClient = useQueryClient()
  const challengesQuery = useChallenges()
  const userQuery = useCurrentUser()

  const challenges = $derived($challengesQuery.data ?? [])
  const user = $derived($userQuery.data)
  const solvedIds = $derived(new Set(user?.solves.map(s => s.id) ?? []))
  let selected = $state<Challenge | null>(null)

  const flagForm = useApiForm(SubmitFlagRoute, {
    onSuccess: res => {
      if (res.kind === GoodFlag.kind) {
        queryClient.invalidateQueries({ queryKey: queryKeys.challenges })
        queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
        selected = null
      }
    },
  })

  function select(c: Challenge) {
    selected = c
    flagForm.setData({ id: c.id, flag: '' })
  }

  const grouped = $derived(() => {
    const g: Record<string, Challenge[]> = {}
    for (const c of challenges) (g[c.category] ??= []).push(c)
    return g
  })
</script>

<h1>Challenges</h1>

{#if $challengesQuery.isPending}
  <p>Loading...</p>
{:else if $challengesQuery.isError}
  <p style="color:red">Error: {$challengesQuery.error.message}</p>
{:else if !challenges.length}
  <p>No challenges yet.</p>
{:else}
  {#each Object.entries(grouped()) as [category, challs]}
    <section>
      <h2>{category}</h2>
      <ul>
        {#each challs as c}
          {@const solved = solvedIds.has(c.id)}
          <li>
            <button
              onclick={() => select(c)}
              style:text-decoration={solved ? 'line-through' : 'none'}>
              {c.name}
            </button>
            - {c.points} pts ({c.solves} solves)
            {#if solved}<span style="color:green">✓</span>{/if}
          </li>
        {/each}
      </ul>
    </section>
  {/each}
{/if}

{#if selected}
  <dialog open>
    <article>
      <header>
        <h3>{selected.name}</h3>
        <p>{selected.category} · {selected.points} pts · {selected.solves} solves</p>
        <p><em>by {selected.author}</em></p>
      </header>

      <p>{selected.description}</p>

      {#if selected.files.length}
        <h4>Files</h4>
        <ul>
          {#each selected.files as f}
            <li>
              <a href={f.url} target="_blank" rel="noopener">{f.name}</a>
            </li>
          {/each}
        </ul>
      {/if}

      {#if !solvedIds.has(selected.id)}
        <form onsubmit={flagForm.submit}>
          <label
            >Flag <input
              type="text"
              bind:value={flagForm.data.flag}
              placeholder="flag..." /></label>
          {#if flagForm.errors.flag}
            <em>{flagForm.errors.flag}</em>
          {/if}
          {#if flagForm.errors._form}
            <p style="color:red">{flagForm.errors._form}</p>
          {/if}
          <button disabled={flagForm.submitting}
            >{flagForm.submitting ? 'Submitting...' : 'Submit'}</button>
        </form>
      {:else}
        <p style="color:green">Already solved!</p>
      {/if}

      <footer><button onclick={() => (selected = null)}>Close</button></footer>
    </article>
  </dialog>
{/if}
