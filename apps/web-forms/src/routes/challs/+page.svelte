<script lang="ts">
  import { GoodFlag, SubmitFlagRoute } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import type { Challenge } from '$lib/api'
  import { required, useMutationForm } from '$lib/forms'
  import { queryKeys, useChallenges, useCurrentUser } from '$lib/query'

  const queryClient = useQueryClient()
  const challengesQuery = useChallenges()
  const userQuery = useCurrentUser()

  const challenges = $derived($challengesQuery.data ?? [])
  const user = $derived($userQuery.data)
  const solvedIds = $derived(new Set(user?.solves.map(s => s.id) ?? []))

  let selectedChallenge = $state<Challenge | null>(null)

  const flagForm = useMutationForm({
    route: SubmitFlagRoute,
    initial: { flag: '' },
    validators: { flag: required },
    transform: values => ({
      id: selectedChallenge!.id,
      flag: values.flag,
    }),
    onSuccess: response => {
      if (response.kind === GoodFlag.kind) {
        queryClient.invalidateQueries({ queryKey: queryKeys.challenges })
        queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
        closeChallenge()
      }
    },
  })

  function selectChallenge(challenge: Challenge) {
    selectedChallenge = challenge
    flagForm.reset()
  }

  function closeChallenge() {
    selectedChallenge = null
    flagForm.reset()
  }

  const groupedChallenges = $derived(() => {
    const groups: Record<string, Challenge[]> = {}
    for (const challenge of challenges) {
      if (!groups[challenge.category]) {
        groups[challenge.category] = []
      }
      groups[challenge.category].push(challenge)
    }
    return groups
  })
</script>

<h1>Challenges</h1>

{#if $challengesQuery.isPending}
  <p>Loading challenges...</p>
{:else if $challengesQuery.isError}
  <p style="color: red">Error: {$challengesQuery.error.message}</p>
{:else if challenges.length === 0}
  <p>No challenges available yet.</p>
{:else}
  {#each Object.entries(groupedChallenges()) as [category, categoryChalls]}
    <section>
      <h2>{category}</h2>
      <ul>
        {#each categoryChalls as challenge}
          {@const isSolved = solvedIds.has(challenge.id)}
          <li>
            <button
              onclick={() => selectChallenge(challenge)}
              style:text-decoration={isSolved ? 'line-through' : 'none'}>
              {challenge.name}
            </button>
            - {challenge.points} pts ({challenge.solves} solves)
            {#if isSolved}
              <span style="color: green">✓</span>
            {/if}
          </li>
        {/each}
      </ul>
    </section>
  {/each}
{/if}

{#if selectedChallenge}
  <dialog open>
    <article>
      <header>
        <h3>{selectedChallenge.name}</h3>
        <p>
          {selectedChallenge.category} | {selectedChallenge.points} pts |
          {selectedChallenge.solves} solves
        </p>
        <p><em>by {selectedChallenge.author}</em></p>
      </header>

      <div>
        <p>{selectedChallenge.description}</p>

        {#if selectedChallenge.files.length > 0}
          <h4>Files</h4>
          <ul>
            {#each selectedChallenge.files as file}
              <li>
                <a href={file.url} target="_blank" rel="noopener">{file.name}</a>
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      {#if !solvedIds.has(selectedChallenge.id)}
        <form onsubmit={flagForm.handleSubmit}>
          <div>
            <label for="flag">Flag</label>
            <input
              id="flag"
              type="text"
              value={flagForm.values.flag}
              oninput={e => flagForm.setValue('flag', e.currentTarget.value)}
              placeholder="flag..."
              required />
            {#if flagForm.errors.flag}
              <span style="color: red">{flagForm.errors.flag}</span>
            {/if}
          </div>

          <button type="submit" disabled={flagForm.isPending}>
            {flagForm.isPending ? 'Submitting...' : 'Submit Flag'}
          </button>
        </form>
      {:else}
        <p style="color: green">You have already solved this challenge!</p>
      {/if}

      <footer>
        <button onclick={closeChallenge}>Close</button>
      </footer>
    </article>
  </dialog>
{/if}
