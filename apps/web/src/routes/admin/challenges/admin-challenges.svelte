<script lang="ts">
  import { useMachine } from '@xstate/svelte'
  import { Drawer, Resizable } from '$lib/components'
  import { editorMachine } from '$lib/machines'
  import { useAdminChallenges } from '$lib/query'
  import type { AdminChallenge } from '@rctf/types'
  import AdminChallengesDetails from './admin-challenges-details.svelte'
  import AdminChallengesList from './admin-challenges-list.svelte'

  const challengesQuery = useAdminChallenges()
  const { snapshot, send } = useMachine(editorMachine)

  const challenges = $derived(challengesQuery.data ?? [])
  const selectedId = $derived(
    $snapshot.matches('idle') ? null : ($snapshot.context.challenge?.id ?? null)
  )
  const isCreating = $derived($snapshot.matches('creating'))

  let drawerOpen = $state(false)
  let innerWidth = $state(0)

  const listMinSize = $derived(innerWidth < 1280 ? 40 : 20)
  const isMobile = $derived(innerWidth < 768)

  let wasMobile = $state(false)
  $effect(() => {
    if (!isMobile) {
      drawerOpen = false
    } else if (!wasMobile && isMobile && (selectedId || isCreating)) {
      drawerOpen = true
    }
    wasMobile = isMobile
  })

  $effect(() => {
    if (isMobile && !selectedId && !isCreating) {
      drawerOpen = false
    }
  })

  function handleSelect(challenge: AdminChallenge | null) {
    if (challenge) {
      send({ type: 'SELECT', challenge })
      if (isMobile) {
        drawerOpen = true
      }
    }
  }

  function handleCreateNew() {
    send({ type: 'CREATE' })
    if (isMobile) {
      drawerOpen = true
    }
  }
</script>

<svelte:window bind:innerWidth />

<div class="hidden h-[calc(100vh-72px)] md:block">
  <Resizable.PaneGroup direction="horizontal" class="gap-2">
    <Resizable.Pane defaultSize={40} minSize={listMinSize} maxSize={50}>
      <div class="bg-background-l1 h-full rounded-r-3xl">
        <AdminChallengesList
          {challenges}
          {selectedId}
          isCreatingNew={isCreating}
          onSelect={handleSelect}
          onCreateNew={handleCreateNew}
        />
      </div>
    </Resizable.Pane>

    <Resizable.Handle withHandle />

    <Resizable.Pane defaultSize={60} minSize={40}>
      <div class="bg-background-l1 h-full rounded-l-3xl">
        <AdminChallengesDetails snapshot={$snapshot} {send} />
      </div>
    </Resizable.Pane>
  </Resizable.PaneGroup>
</div>

<div class="flex h-[calc(100vh-72px)] flex-col md:hidden">
  <div class="bg-background-l1 h-full">
    <AdminChallengesList
      {challenges}
      {selectedId}
      isCreatingNew={isCreating}
      onSelect={handleSelect}
      onCreateNew={handleCreateNew}
    />
  </div>

  <Drawer.Root bind:open={drawerOpen}>
    <Drawer.Content class="h-full">
      <div class="flex-1 overflow-auto">
        <AdminChallengesDetails snapshot={$snapshot} {send} />
      </div>
    </Drawer.Content>
  </Drawer.Root>
</div>
