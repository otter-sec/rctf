<script lang="ts">
  import type { Challenge, Solve } from '$lib/api'
  import { Resizable } from '$lib/components'
  import ChallengeDetail from './challenge-detail.svelte'
  import ChallengeList from './challenge-list.svelte'

  let {
    challenges,
    solves = [],
  }: { challenges: Challenge[]; solves: Solve[] } = $props()

  let localSolvedIds = $state(new Set<string>())
  const solvedIds = $derived(
    new Set([...solves.map(s => s.id), ...localSolvedIds])
  )

  let selectedChallenge = $state<Challenge | null>(null)

  function handleSelect(challenge: Challenge) {
    selectedChallenge = challenge
  }

  function handleSolve(challengeId: string) {
    localSolvedIds.add(challengeId)
    localSolvedIds = new Set(localSolvedIds)
  }

  const selectedIsSolved = $derived(
    selectedChallenge ? solvedIds.has(selectedChallenge.id) : false
  )
</script>

<div class="h-[calc(100vh-72px)]">
  <Resizable.PaneGroup direction="horizontal" class="gap-2">
    <Resizable.Pane defaultSize={40} minSize={25} maxSize={50}>
      <div class="h-full rounded-r-3xl bg-background-l1">
        <ChallengeList
          {challenges}
          {solvedIds}
          selectedId={selectedChallenge?.id ?? null}
          onSelect={handleSelect}
        />
      </div>
    </Resizable.Pane>

    <Resizable.Handle withHandle />

    <Resizable.Pane defaultSize={60} minSize={40}>
      <div class="h-full rounded-l-3xl bg-background-l1">
        <ChallengeDetail
          challenge={selectedChallenge}
          isSolved={selectedIsSolved}
          onSolve={handleSolve}
        />
      </div>
    </Resizable.Pane>
  </Resizable.PaneGroup>
</div>
