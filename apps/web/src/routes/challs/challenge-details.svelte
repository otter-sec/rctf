<script lang="ts">
  import type { Challenge } from '$lib/api'
  import { EmptyState, Tabs } from '$lib/components'
  import {
    IconFileInfoFilled,
    IconFlagFilled,
    IconTrophyFilled,
  } from '$lib/icons'
  import ChallengeDetailsTab from './challenge-details-tab.svelte'
  import ChallengeFlagForm from './challenge-flag-form.svelte'
  import ChallengeHeader from './challenge-header.svelte'
  import ChallengePodium from './challenge-podium.svelte'
  import ChallengeSolvesTab from './challenge-solves-tab.svelte'
  import ChallengeUserSolve from './challenge-user-solve.svelte'

  type Props = {
    challenge: Challenge | null
    isSolved: boolean
    onSolve: (challengeId: string) => void
  }

  let { challenge, isSolved, onSolve }: Props = $props()

  let activeTab = $state('details')
  let userVisibleInSolves = $state(false)

  $effect(() => {
    challenge?.id
    activeTab = 'details'
  })
</script>

{#if challenge}
  {#key challenge.id}
    <div class="flex h-full flex-col">
      <ChallengeHeader {challenge} {isSolved} />

      <Tabs.Root bind:value={activeTab} class="flex min-h-0 flex-1 flex-col">
        <div class="px-5">
          <Tabs.List class="h-auto w-fit gap-0 rounded-none bg-transparent p-0">
            <Tabs.Trigger
              value="details"
              class="rounded-t-lg rounded-b-none px-4 py-1 data-[state=active]:bg-background-l2 data-[state=active]:shadow-none"
            >
              <IconFileInfoFilled class="size-4" />
              Details
            </Tabs.Trigger>
            <Tabs.Trigger
              value="solves"
              class="rounded-t-lg rounded-b-none px-4 py-1 data-[state=active]:bg-background-l2 data-[state=active]:shadow-none"
            >
              <IconTrophyFilled class="size-4" />
              Solves{challenge.solves !== null ? ` (${challenge.solves})` : ''}
            </Tabs.Trigger>
          </Tabs.List>
        </div>

        <div class="min-h-0 flex-1 bg-background-l2">
          <Tabs.Content value="details" class="h-full">
            <ChallengeDetailsTab {challenge} />
          </Tabs.Content>

          <Tabs.Content value="solves" class="h-full">
            <ChallengeSolvesTab
              {challenge}
              bind:userVisibleInList={userVisibleInSolves}
            />
          </Tabs.Content>
        </div>
      </Tabs.Root>

      <div class="flex flex-col gap-2 bg-background-l2 px-5 py-4">
        {#if activeTab === 'details'}
          <ChallengePodium {challenge} {isSolved} />
        {:else if activeTab === 'solves' && !userVisibleInSolves}
          <ChallengeUserSolve {challenge} />
        {/if}
        <ChallengeFlagForm {challenge} {isSolved} {onSolve} />
      </div>
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
