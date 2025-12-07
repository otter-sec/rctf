<script lang="ts">
  import { GoodChallengeUpdateV2, GoodChallengeDelete } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { useMachine } from '@xstate/svelte'
  import { editorMachine, type FormData } from '$lib/machines'
  import {
    queryKeys,
    useAdminChallenges,
    useAdminChallenge,
    useUpdateChallengeMutation,
    useDeleteChallengeMutation,
  } from '$lib/query'

  const queryClient = useQueryClient()
  const challengesQuery = useAdminChallenges()
  const updateMutation = useUpdateChallengeMutation()
  const deleteMutation = useDeleteChallengeMutation()

  const { snapshot, send } = useMachine(editorMachine)

  const challenges = $derived($challengesQuery.data ?? [])
  const state = $derived($snapshot)
  const form = $derived(state.context.form)
  const challenge = $derived(state.context.challenge)

  const isIdle = $derived(state.matches('idle'))
  const isViewing = $derived(state.matches('viewing'))
  const isEditing = $derived(state.matches('editing'))
  const isCreating = $derived(state.matches('creating'))
  const isSaving = $derived(state.matches('saving'))
  const isConfirmDiscard = $derived(state.matches('confirmDiscard'))
  const isConfirmDelete = $derived(state.matches('confirmDelete'))
  const isDeleting = $derived(state.matches('deleting'))

  const isEditMode = $derived(isEditing || isCreating)
  const showForm = $derived(!isIdle)

  const detailQuery = $derived(useAdminChallenge(challenge?.id ?? '', !!challenge?.id))

  let prevDetailId: string | undefined = undefined
  $effect(() => {
    const detail = $detailQuery.data
    if (detail && challenge?.id === detail.id && detail.id !== prevDetailId) {
      prevDetailId = detail.id
      send({ type: 'DETAIL_LOADED', detail })
    }
  })

  function updateField<K extends keyof FormData>(field: K, value: FormData[K]) {
    send({ type: 'UPDATE_FORM', field, value })
  }

  function handleSave() {
    const id = isCreating ? crypto.randomUUID() : challenge!.id

    send({ type: 'SAVE' })

    $updateMutation.mutate(
      {
        id,
        data: {
          name: form.name,
          category: form.category,
          author: form.author,
          description: form.description,
          flag: form.flag,
          points: { min: form.pointsMin, max: form.pointsMax },
          tiebreakEligible: form.tiebreakEligible,
          sortWeight: form.sortWeight || undefined,
          files: form.files,
          instancerConfig: form.instancerConfig,
        },
      },
      {
        onSuccess: response => {
          if (response.kind === GoodChallengeUpdateV2.kind) {
            queryClient.invalidateQueries({ queryKey: queryKeys.adminChallenges })
            send({
              type: 'SAVE_SUCCESS',
              challenge: {
                id,
                name: form.name,
                category: form.category,
                author: form.author,
                description: form.description,
                flag: form.flag,
                points: { min: form.pointsMin, max: form.pointsMax },
                files: form.files,
                tiebreakEligible: form.tiebreakEligible,
                sortWeight: form.sortWeight,
                instancerConfig: form.instancerConfig,
              },
            })
          } else {
            send({ type: 'SAVE_ERROR' })
          }
        },
        onError: () => {
          send({ type: 'SAVE_ERROR' })
        },
      }
    )
  }

  function handleDelete() {
    send({ type: 'DELETE' })
  }

  function handleDeleteConfirm() {
    if (!challenge) return

    send({ type: 'DELETE_CONFIRM' })

    $deleteMutation.mutate(
      { id: challenge.id },
      {
        onSuccess: response => {
          if (response.kind === GoodChallengeDelete.kind) {
            queryClient.invalidateQueries({ queryKey: queryKeys.adminChallenges })
            send({ type: 'DELETE_SUCCESS' })
          } else {
            send({ type: 'DELETE_ERROR' })
          }
        },
        onError: () => {
          send({ type: 'DELETE_ERROR' })
        },
      }
    )
  }
</script>

<h1>Admin - Challenges</h1>

<div style="display: flex; gap: 2rem;">
  <aside style="width: 250px;">
    <h2>Challenges</h2>
    <button onclick={() => send({ type: 'CREATE' })}>+ New Challenge</button>

    {#if $challengesQuery.isPending}
      <p>Loading...</p>
    {:else}
      <ul>
        {#each challenges as chall}
          <li>
            <button
              onclick={() => send({ type: 'SELECT', challenge: chall })}
              style:font-weight={challenge?.id === chall.id ? 'bold' : 'normal'}>
              {chall.name}
            </button>
            <small>({chall.category})</small>
          </li>
        {/each}
      </ul>
    {/if}
  </aside>

  <main style="flex: 1;">
    {#if isIdle}
      <p>Select a challenge or create a new one.</p>
    {:else if showForm}
      <header>
        <h2>{isCreating ? 'New Challenge' : form.name || 'Untitled'}</h2>
        <p>State: {state.value}</p>
      </header>

      <fieldset disabled={!isEditMode}>
        <div>
          <label for="name">Name</label>
          <input
            id="name"
            type="text"
            value={form.name}
            oninput={e => updateField('name', e.currentTarget.value)}
            required />
        </div>

        <div>
          <label for="category">Category</label>
          <input
            id="category"
            type="text"
            value={form.category}
            oninput={e => updateField('category', e.currentTarget.value)}
            required />
        </div>

        <div>
          <label for="author">Author</label>
          <input
            id="author"
            type="text"
            value={form.author}
            oninput={e => updateField('author', e.currentTarget.value)}
            required />
        </div>

        <div>
          <label for="description">Description</label>
          <textarea
            id="description"
            value={form.description}
            oninput={e => updateField('description', e.currentTarget.value)}
            rows={6}
            required></textarea>
        </div>

        <div>
          <label for="flag">Flag</label>
          <input
            id="flag"
            type="text"
            value={form.flag}
            oninput={e => updateField('flag', e.currentTarget.value)}
            required />
        </div>

        <div style="display: flex; gap: 1rem;">
          <div>
            <label for="pointsMin">Min Points</label>
            <input
              id="pointsMin"
              type="number"
              value={form.pointsMin}
              oninput={e => updateField('pointsMin', +e.currentTarget.value)}
              min={0} />
          </div>
          <div>
            <label for="pointsMax">Max Points</label>
            <input
              id="pointsMax"
              type="number"
              value={form.pointsMax}
              oninput={e => updateField('pointsMax', +e.currentTarget.value)}
              min={0} />
          </div>
        </div>

        <div>
          <label>
            <input
              type="checkbox"
              checked={form.tiebreakEligible}
              onchange={e => updateField('tiebreakEligible', e.currentTarget.checked)} />
            Tiebreak Eligible
          </label>
        </div>

        <div>
          <label for="sortWeight">Sort Weight</label>
          <input
            id="sortWeight"
            type="number"
            value={form.sortWeight}
            oninput={e => updateField('sortWeight', +e.currentTarget.value)} />
        </div>
      </fieldset>

      <div style="margin-top: 1rem;">
        {#if isEditMode}
          <button onclick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : isCreating ? 'Create' : 'Save'}
          </button>
          <button onclick={() => send({ type: 'CANCEL' })}>Cancel</button>
          {#if !isCreating}
            <button onclick={handleDelete} style="color: red;">Delete</button>
          {/if}
        {:else}
          <button onclick={() => send({ type: 'EDIT' })}>Edit</button>
        {/if}
      </div>
    {/if}
  </main>
</div>

{#if isConfirmDiscard}
  <dialog open>
    <p>You have unsaved changes. Discard them?</p>
    <button onclick={() => send({ type: 'DISCARD' })}>Discard</button>
    <button onclick={() => send({ type: 'KEEP_EDITING' })}>Keep Editing</button>
  </dialog>
{/if}

{#if isConfirmDelete}
  <dialog open>
    <p>Delete challenge "{form.name}"?</p>
    <button onclick={handleDeleteConfirm} disabled={isDeleting}>
      {isDeleting ? 'Deleting...' : 'Delete'}
    </button>
    <button onclick={() => send({ type: 'DELETE_CANCEL' })}>Cancel</button>
  </dialog>
{/if}
