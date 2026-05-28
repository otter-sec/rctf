<script lang="ts">
  import { ChallengeScoringKind, type Challenge } from '@rctf/types'
  import { EmptyState, Tabs } from '$lib/components'
  import {
    IconChartAreaLineFilled,
    IconFileInfoFilled,
    IconFlagFilled,
    IconTrophyFilled,
  } from '$lib/icons'
  import ChallengeDetailsHeader from './challenges-details-header.svelte'
  import ChallengeDetailsOverview from './challenges-details-overview.svelte'
  import ChallengeDetailsPodiumDynamic from './challenges-details-podium-dynamic.svelte'
  import ChallengeDetailsPodium from './challenges-details-podium.svelte'
  import ChallengeDetailsScores from './challenges-details-scores.svelte'
  import ChallengeDetailsSolves from './challenges-details-solves.svelte'
  import ChallengeDetailsSubmit from './challenges-details-submit.svelte'

  interface Props {
    challenge: Challenge | null
    isSolved: boolean
    onSolve: (challengeId: string) => void
  }

  let { challenge, isSolved, onSolve }: Props = $props()

  let selectedTab = $state('details')

  const isDynamic = $derived(challenge?.scoringKind === ChallengeScoringKind.DYNAMIC)

  const tab = $derived.by(() => {
    if (selectedTab === 'solves' && !challenge?.hasFlag) return 'details'
    if (selectedTab === 'scores' && !isDynamic) return 'details'
    return selectedTab
  })
</script>

{#if challenge}
  {#key challenge.id}
    <div class="@container/details flex h-full flex-col">
      <ChallengeDetailsHeader {challenge} {isSolved} />

      <Tabs.Root
        value={tab}
        onValueChange={value => (selectedTab = value)}
        class="flex min-h-0 flex-1 flex-col"
      >
        <div class="px-5">
          <Tabs.List class="h-auto w-fit gap-0 rounded-none bg-transparent p-0">
            <Tabs.Trigger
              value="details"
              class="data-[state=active]:bg-background-l2 rounded-t-lg rounded-b-none px-4 py-1 data-[state=active]:shadow-none"
            >
              <IconFileInfoFilled class="size-4" />
              Details
            </Tabs.Trigger>
            {#if challenge.hasFlag}
              <Tabs.Trigger
                value="solves"
                class="data-[state=active]:bg-background-l2 rounded-t-lg rounded-b-none px-4 py-1 data-[state=active]:shadow-none"
              >
                <IconTrophyFilled class="size-4" />
                Solves{challenge.solves !== null ? ` (${challenge.solves})` : ''}
              </Tabs.Trigger>
            {:else if isDynamic}
              <Tabs.Trigger
                value="scores"
                class="data-[state=active]:bg-background-l2 rounded-t-lg rounded-b-none px-4 py-1 data-[state=active]:shadow-none"
              >
                <IconChartAreaLineFilled class="size-4" />
                Scores{challenge.solves !== null ? ` (${challenge.solves})` : ''}
              </Tabs.Trigger>
            {/if}
          </Tabs.List>
        </div>

        <div class="bg-background-l2 min-h-0 flex-1">
          <Tabs.Content value="details" class="h-full">
            {#snippet child({ props })}
              {@const { role: _role, tabindex: _tabindex, ...panelProps } = props}
              <div {...panelProps} role="tabpanel" tabindex={-1}>
                <ChallengeDetailsOverview {challenge} />
              </div>
            {/snippet}
          </Tabs.Content>
          {#if challenge.hasFlag}
            <Tabs.Content value="solves" class="h-full">
              {#snippet child({ props })}
                {@const { role: _role, tabindex: _tabindex, ...panelProps } = props}
                <div {...panelProps} role="tabpanel" tabindex={-1}>
                  <ChallengeDetailsSolves {challenge} />
                </div>
              {/snippet}
            </Tabs.Content>
          {:else if isDynamic}
            <Tabs.Content value="scores" class="h-full">
              {#snippet child({ props })}
                {@const { role: _role, tabindex: _tabindex, ...panelProps } = props}
                <div {...panelProps} role="tabpanel" tabindex={-1}>
                  <ChallengeDetailsScores {challenge} />
                </div>
              {/snippet}
            </Tabs.Content>
          {/if}
        </div>
      </Tabs.Root>

      {#if challenge.hasFlag}
        <div class="bg-background-l2 flex flex-col gap-2 px-5 pt-2 pb-4">
          {#if tab === 'details'}
            <ChallengeDetailsPodium {challenge} {isSolved} />
          {/if}
          <ChallengeDetailsSubmit {challenge} {isSolved} {onSolve} />
        </div>
      {:else if isDynamic && tab === 'details'}
        <div class="bg-background-l2 flex flex-col gap-2 px-5 pt-2 pb-4">
          <ChallengeDetailsPodiumDynamic {challenge} />
        </div>
      {/if}
    </div>
  {/key}
{:else}
  <EmptyState
    icon={IconFlagFilled}
    title="Select a challenge"
    subtitle="Choose a challenge from the list to view details"
    class="h-full"
  />
{/if}
