<script lang="ts">
  import type { AdminChallenge } from '$lib/api'
  import { Resizable } from '$lib/components'
  import { useAdminChallenges } from '$lib/query'
  import AdminChallList from './admin-chall-list.svelte'
  import AdminChallDetails from './admin-chall-details.svelte'

  const challengesQuery = useAdminChallenges()
  const challenges = $derived($challengesQuery.data ?? [])

  let selectedChallenge = $state<AdminChallenge | null>(null)
  let isCreatingNew = $state(false)
  let detailsRef = $state<ReturnType<typeof AdminChallDetails> | null>(null)

  function handleSelect(challenge: AdminChallenge | null) {
    if (challenge?.id === selectedChallenge?.id) return

    const proceed = () => {
      isCreatingNew = false
      selectedChallenge = challenge
    }

    if (detailsRef?.checkUnsavedChanges(proceed)) return
    proceed()
  }

  function handleCreateNew() {
    if (isCreatingNew) return

    const proceed = () => {
      selectedChallenge = null
      isCreatingNew = true
    }

    if (detailsRef?.checkUnsavedChanges(proceed)) return
    proceed()
  }

  function handleSaved(challenge: AdminChallenge) {
    selectedChallenge = challenge
    isCreatingNew = false
  }

  function handleDeleted() {
    selectedChallenge = null
    isCreatingNew = false
  }

  function handleCancelNew() {
    isCreatingNew = false
  }
</script>

<div class="h-[calc(100vh-72px)]">
  <Resizable.PaneGroup direction="horizontal" class="gap-2">
    <Resizable.Pane defaultSize={40} minSize={20} maxSize={45}>
      <div class="h-full rounded-r-3xl bg-background-l1">
        <AdminChallList
          {challenges}
          selectedId={selectedChallenge?.id ?? null}
          {isCreatingNew}
          onSelect={handleSelect}
          onCreateNew={handleCreateNew}
        />
      </div>
    </Resizable.Pane>

    <Resizable.Handle withHandle />

    <Resizable.Pane defaultSize={60} minSize={40}>
      <div class="h-full rounded-l-3xl bg-background-l1">
        <AdminChallDetails
          bind:this={detailsRef}
          challenge={selectedChallenge}
          {isCreatingNew}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onCancelNew={handleCancelNew}
        />
      </div>
    </Resizable.Pane>
  </Resizable.PaneGroup>
</div>

