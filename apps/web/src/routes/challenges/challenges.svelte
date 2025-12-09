<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { Drawer, Resizable } from '$lib/components'
  import { queryKeys, useChallenges, useCurrentUser } from '$lib/query'
  import ChallengeDetails from './challenge-details.svelte'
  import ChallengeList from './challenge-list.svelte'

  const queryClient = useQueryClient()
  const challengesQuery = useChallenges()
  const userQuery = useCurrentUser()

  const challenges = $derived($challengesQuery.data ?? [])
  const solves = $derived($userQuery.data?.solves ?? [])

  let localSolvedIds = $state(new Set<string>())
  const solvedIds = $derived(new Set([...solves.map(s => s.id), ...localSolvedIds]))

  const firstBloodIds = $derived(new Set(solves.filter(s => s.solves === 1).map(s => s.id)))

  let selectedChallenge = $state<Challenge | null>(null)
  let drawerOpen = $state(false)
  let innerWidth = $state(0)

  const listMinSize = $derived(innerWidth < 1280 ? 40 : 20)
  const isMobile = $derived(innerWidth < 768)

  function handleSelect(challenge: Challenge) {
    selectedChallenge = challenge
    if (isMobile) {
      drawerOpen = true
    }
  }

  function handleSolve(challengeId: string) {
    localSolvedIds.add(challengeId)
    localSolvedIds = new Set(localSolvedIds)
    queryClient.invalidateQueries({ queryKey: queryKeys.challenges })
    queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
  }

  const selectedIsSolved = $derived(selectedChallenge ? solvedIds.has(selectedChallenge.id) : false)
</script>

<svelte:window bind:innerWidth />

<div class="hidden h-[calc(100vh-72px)] md:block">
  <Resizable.PaneGroup direction="horizontal" class="gap-2">
    <Resizable.Pane defaultSize={40} minSize={listMinSize} maxSize={50}>
      <div class="h-full rounded-r-3xl bg-background-l1">
        <ChallengeList
          {challenges}
          {solvedIds}
          {firstBloodIds}
          selectedId={selectedChallenge?.id ?? null}
          onSelect={handleSelect}
        />
      </div>
    </Resizable.Pane>

    <Resizable.Handle withHandle />

    <Resizable.Pane defaultSize={60} minSize={40}>
      <div class="h-full rounded-l-3xl bg-background-l1">
        <ChallengeDetails
          challenge={selectedChallenge}
          isSolved={selectedIsSolved}
          onSolve={handleSolve}
        />
      </div>
    </Resizable.Pane>
  </Resizable.PaneGroup>
</div>

<div class="flex h-[calc(100vh-72px)] flex-col md:hidden">
  <div class="h-full bg-background-l1">
    <ChallengeList
      {challenges}
      {solvedIds}
      {firstBloodIds}
      selectedId={selectedChallenge?.id ?? null}
      onSelect={handleSelect}
    />
  </div>

  <Drawer.Root bind:open={drawerOpen}>
    <Drawer.Content class="h-full">
      <div class="flex-1 overflow-auto">
        <ChallengeDetails
          challenge={selectedChallenge}
          isSolved={selectedIsSolved}
          onSolve={handleSolve}
        />
      </div>
    </Drawer.Content>
  </Drawer.Root>
</div>
