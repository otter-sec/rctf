<script lang="ts">
  import type { Challenge, Solve } from '$lib/api'
  import { Resizable } from '$lib/components'
  import ChallengeDetails from './challenge-details.svelte'
  import ChallengeList from './challenge-list.svelte'

  let {
    challenges: initialChallenges,
    solves = [],
  }: { challenges: Challenge[]; solves: Solve[] } = $props()

  let challenges = $state(initialChallenges)
  let localSolvedIds = $state(new Set<string>())
  const solvedIds = $derived(
    new Set([...solves.map(s => s.id), ...localSolvedIds])
  )

  const firstBloodIds = $derived(
    new Set(solves.filter(s => s.solves === 1).map(s => s.id))
  )

  let selectedChallenge = $state<Challenge | null>(null)

  function handleSelect(challenge: Challenge) {
    selectedChallenge = challenge
  }

  function handleSolve(challengeId: string) {
    localSolvedIds.add(challengeId)
    localSolvedIds = new Set(localSolvedIds)
    challenges = challenges.map(c =>
      c.id === challengeId && c.solves !== null
        ? { ...c, solves: c.solves + 1 }
        : c
    )
    if (
      selectedChallenge?.id === challengeId &&
      selectedChallenge.solves !== null
    ) {
      selectedChallenge = {
        ...selectedChallenge,
        solves: selectedChallenge.solves + 1,
      }
    }
  }

  const selectedIsSolved = $derived(
    selectedChallenge ? solvedIds.has(selectedChallenge.id) : false
  )
</script>

<div class="h-[calc(100vh-72px)]">
  <Resizable.PaneGroup direction="horizontal" class="gap-2">
    <Resizable.Pane defaultSize={40} minSize={20} maxSize={50}>
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
