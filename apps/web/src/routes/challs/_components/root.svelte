<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { Resizable } from '$lib/components'
  import { queryKeys, useChallenges, useCurrentUser } from '$lib/query'
  import Details from './details.svelte'
  import List from './list.svelte'

  const queryClient = useQueryClient()
  const challengesQuery = useChallenges()
  const userQuery = useCurrentUser()

  const challenges = $derived($challengesQuery.data ?? [])
  const solves = $derived($userQuery.data?.solves ?? [])

  let localSolvedIds = $state(new Set<string>())
  const solvedIds = $derived(new Set([...solves.map(s => s.id), ...localSolvedIds]))

  const firstBloodIds = $derived(new Set(solves.filter(s => s.solves === 1).map(s => s.id)))

  let selectedChallenge = $state<Challenge | null>(null)

  function handleSelect(challenge: Challenge) {
    selectedChallenge = challenge
  }

  function handleSolve(challengeId: string) {
    localSolvedIds.add(challengeId)
    localSolvedIds = new Set(localSolvedIds)
    queryClient.invalidateQueries({ queryKey: queryKeys.challenges })
    queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
  }

  const selectedIsSolved = $derived(selectedChallenge ? solvedIds.has(selectedChallenge.id) : false)
</script>

<div class="h-[calc(100vh-72px)]">
  <Resizable.PaneGroup direction="horizontal" class="gap-2">
    <Resizable.Pane defaultSize={40} minSize={20} maxSize={50}>
      <div class="h-full rounded-r-3xl bg-background-l1">
        <List
          {challenges}
          {solvedIds}
          {firstBloodIds}
          selectedId={selectedChallenge?.id ?? null}
          onSelect={handleSelect} />
      </div>
    </Resizable.Pane>

    <Resizable.Handle withHandle />

    <Resizable.Pane defaultSize={60} minSize={40}>
      <div class="h-full rounded-l-3xl bg-background-l1">
        <Details challenge={selectedChallenge} isSolved={selectedIsSolved} onSolve={handleSolve} />
      </div>
    </Resizable.Pane>
  </Resizable.PaneGroup>
</div>
