<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import { tick } from 'svelte'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { page } from '$app/state'
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

  const urlChallengeId = $derived(page.url.searchParams.get('chall'))
  let selectedChallengeId = $state<string | null>(null)
  let hasScrolledToUrl = $state(false)

  $effect(() => {
    if (urlChallengeId && challenges.length > 0) {
      const exists = challenges.some(c => c.id === urlChallengeId)
      if (exists && selectedChallengeId !== urlChallengeId) {
        selectedChallengeId = urlChallengeId
        if (!hasScrolledToUrl) {
          hasScrolledToUrl = true
          tick().then(() => {
            const el = document.getElementById(`chall-${urlChallengeId}`)
            el?.scrollIntoView({ behavior: 'instant', block: 'center' })
          })
        }
      }
    }
  })

  let drawerOpen = $state(false)
  let innerWidth = $state(0)

  const selectedChallenge = $derived(
    selectedChallengeId ? (challenges.find(c => c.id === selectedChallengeId) ?? null) : null
  )

  const listMinSize = $derived(innerWidth < 1280 ? 40 : 20)
  const isMobile = $derived(innerWidth < 768)

  function handleSelect(challenge: Challenge) {
    selectedChallengeId = challenge.id
    const url = new URL(window.location.href)
    url.searchParams.set('chall', challenge.id)
    history.replaceState(history.state, '', url)
    if (isMobile) {
      drawerOpen = true
    }
  }

  function handleSolve(challengeId: string) {
    localSolvedIds.add(challengeId)
    localSolvedIds = new Set(localSolvedIds)

    // FIXME(es3n1n): Small delay to allow the server's leaderboard worker to update the cache
    setTimeout(() => {
      queryClient.refetchQueries({ queryKey: queryKeys.challenges })
      queryClient.refetchQueries({ queryKey: queryKeys.userSelf })
      queryClient.invalidateQueries({ queryKey: queryKeys.fullLeaderboard })
    }, 500)
  }

  const selectedIsSolved = $derived(selectedChallenge ? solvedIds.has(selectedChallenge.id) : false)
</script>

<svelte:window bind:innerWidth />

<div class="hidden h-[calc(100vh-72px)] md:block">
  <Resizable.PaneGroup direction="horizontal" class="gap-2">
    <Resizable.Pane defaultSize={40} minSize={listMinSize} maxSize={50}>
      <div class="bg-background-l1 h-full rounded-r-3xl">
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
      <div class="bg-background-l1 h-full rounded-l-3xl">
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
  <div class="bg-background-l1 h-full">
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
