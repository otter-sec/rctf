<script lang="ts">
  import { GoodFlag, SubmitFlagRoute, type Challenge } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { createApiForm } from '$lib/forms'
  import { queryKeys, useChallenges, useCurrentUser } from '$lib/query'

  const queryClient = useQueryClient()
  const challengesQuery = useChallenges()
  const userQuery = useCurrentUser()

  const challenges = $derived($challengesQuery.data ?? [])
  const user = $derived($userQuery.data)
  const solvedIds = $derived(new Set(user?.solves.map(s => s.id) ?? []))

  let selectedChallenge = $state<Challenge | null>(null)

  const flagForm = createApiForm({
    route: SubmitFlagRoute,
    defaultValues: { flag: '' },
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
        <form
          onsubmit={e => {
            e.preventDefault()
            e.stopPropagation()
            flagForm.handleSubmit()
          }}>
          <div>
            <flagForm.Field name="flag">
              {#snippet children(field)}
                <label for={field.name}>Flag</label>
                <input
                  id={field.name}
                  name={field.name}
                  type="text"
                  value={field.state.value}
                  oninput={e => field.handleChange(e.currentTarget.value)}
                  onblur={field.handleBlur}
                  placeholder="flag..."
                  required />
                {#if field.state.meta.errors.length > 0}
                  <span style="color: red"
                    >{field.state.meta.errors.map(e => e.message).join(', ')}</span>
                {/if}
              {/snippet}
            </flagForm.Field>
          </div>

          <flagForm.Subscribe selector={state => state.errorMap.onSubmit}>
            {#snippet children(error)}
              {#if error}
                <p style="color: red">{error}</p>
              {/if}
            {/snippet}
          </flagForm.Subscribe>

          <flagForm.Subscribe selector={state => [state.canSubmit, state.isSubmitting]}>
            {#snippet children([canSubmit, isSubmitting])}
              <button type="submit" disabled={!canSubmit}>
                {isSubmitting ? 'Submitting...' : 'Submit Flag'}
              </button>
            {/snippet}
          </flagForm.Subscribe>
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
