<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import { EmptyState, Tabs } from '$lib/components'
  import { IconFileInfoFilled, IconFlagFilled, IconTrophyFilled } from '$lib/icons'
  import ChallengeDetailsHeader from './challenge-details-header.svelte'
  import ChallengeDetailsOverview from './challenge-details-overview.svelte'
  import ChallengeDetailsPodium from './challenge-details-podium.svelte'
  import ChallengeDetailsSelf from './challenge-details-self.svelte'
  import ChallengeDetailsSolves from './challenge-details-solves.svelte'
  import ChallengeDetailsSubmit from './challenge-details-submit.svelte'

  interface Props {
    challenge: Challenge | null
    isSolved: boolean
    onSolve: (challengeId: string) => void
  }

  let { challenge, isSolved, onSolve }: Props = $props()

  let tab = $state('details')
  let userVisible = $state(false)

  const tabClass =
    'rounded-t-lg rounded-b-none px-4 py-1 data-[state=active]:bg-background-l2 data-[state=active]:shadow-none'
</script>

{#if challenge}
  {#key challenge.id}
    <div class="flex h-full flex-col">
      <ChallengeDetailsHeader {challenge} {isSolved} />

      <Tabs.Root bind:value={tab} class="flex min-h-0 flex-1 flex-col">
        <div class="px-5">
          <Tabs.List class="h-auto w-fit gap-0 rounded-none bg-transparent p-0">
            <Tabs.Trigger value="details" class={tabClass}>
              <IconFileInfoFilled class="size-4" />
              Details
            </Tabs.Trigger>
            <Tabs.Trigger value="solves" class={tabClass}>
              <IconTrophyFilled class="size-4" />
              Solves{challenge.solves !== null ? ` (${challenge.solves})` : ''}
            </Tabs.Trigger>
          </Tabs.List>
        </div>

        <div class="min-h-0 flex-1 bg-background-l2">
          <Tabs.Content value="details" class="h-full">
            <ChallengeDetailsOverview {challenge} />
          </Tabs.Content>
          <Tabs.Content value="solves" class="h-full">
            <ChallengeDetailsSolves {challenge} bind:userVisibleInList={userVisible} />
          </Tabs.Content>
        </div>
      </Tabs.Root>

      <div class="flex flex-col gap-2 bg-background-l2 px-5 py-4">
        {#if tab === 'details'}
          <ChallengeDetailsPodium {challenge} {isSolved} />
        {:else if tab === 'solves' && !userVisible}
          <ChallengeDetailsSelf {challenge} />
        {/if}
        <ChallengeDetailsSubmit {challenge} {isSolved} {onSolve} />
      </div>
    </div>
  {/key}
{:else}
  <EmptyState
    icon={IconFlagFilled}
    title="Select a challenge"
    subtitle="Choose a challenge from the list to view details"
    class="h-full" />
{/if}
