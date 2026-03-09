<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import { tick } from 'svelte'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { page } from '$app/state'
  import { Drawer, EmptyState, Resizable } from '$lib/components'
  import { IconFlag3Filled } from '$lib/icons'
  import { queryKeys, useChallenges, useCurrentUser } from '$lib/query'
  import ChallengeDetails from './challenge-details.svelte'
  import ChallengeList from './challenge-list.svelte'

  const queryClient = useQueryClient()
  const challengesQuery = useChallenges()
  const userQuery = useCurrentUser()

  const challenges = $derived(challengesQuery.data ?? [])
  const solves = $derived(userQuery.data?.solves ?? [])

  let localSolvedIds = $state(new Set<string>())
  const solvedIds = $derived(new Set([...solves.map(s => s.id), ...localSolvedIds]))

  const bloodIds = $derived({
    first: new Set(solves.filter(s => s.bloodIndex === 0).map(s => s.id)),
    second: new Set(solves.filter(s => s.bloodIndex === 1).map(s => s.id)),
    third: new Set(solves.filter(s => s.bloodIndex === 2).map(s => s.id)),
  })

  let selectedChallengeId = $state<string | null>(null)
  let hasInitializedFromUrl = $state(false)

  $effect(() => {
    if (!hasInitializedFromUrl && challenges.length > 0) {
      const urlChallengeId = page.url.searchParams.get('challenge')
      if (urlChallengeId) {
        const exists = challenges.some(c => c.id === urlChallengeId)
        if (exists) {
          selectedChallengeId = urlChallengeId
          tick().then(() => {
            const el = document.getElementById(`chall-${urlChallengeId}`)
            el?.scrollIntoView({ behavior: 'instant', block: 'center' })
          })
        }
      }
      hasInitializedFromUrl = true
    }
  })

  let drawerOpen = $state(false)
  let innerWidth = $state(0)

  const selectedChallenge = $derived(
    selectedChallengeId ? (challenges.find(c => c.id === selectedChallengeId) ?? null) : null
  )

  const listMinSize = $derived(innerWidth < 1280 ? 40 : 20)
  const isMobile = $derived(innerWidth < 768)

  let wasMobile = $state(false)
  $effect(() => {
    if (!isMobile) {
      drawerOpen = false
    } else if (!wasMobile && isMobile && selectedChallengeId) {
      drawerOpen = true
    }
    wasMobile = isMobile
  })

  function handleSelect(challenge: Challenge) {
    selectedChallengeId = challenge.id
    const url = new URL(window.location.href)
    url.searchParams.set('challenge', challenge.id)
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

{#if challenges.length === 0}
  <div class="flex h-[calc(100dvh-72px)] items-center justify-center">
    <EmptyState
      icon={IconFlag3Filled}
      title="No challenges yet"
      subtitle="Check back soon for challenges!"
    />
  </div>
{:else}
  <div class="hidden h-[calc(100dvh-72px)] md:block">
    <Resizable.PaneGroup direction="horizontal" class="gap-2">
      <Resizable.Pane defaultSize={40} minSize={listMinSize} maxSize={50}>
        <div class="bg-background-l1 h-full rounded-r-3xl">
          <ChallengeList
            {challenges}
            {solvedIds}
            {bloodIds}
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

  <div class="flex h-[calc(100dvh-72px)] flex-col md:hidden">
    <div class="bg-background-l1 h-full">
      <ChallengeList
        {challenges}
        {solvedIds}
        {bloodIds}
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
{/if}
