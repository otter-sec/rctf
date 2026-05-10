<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import { EmptyState, Tabs } from '$lib/components'
  import { IconFileInfoFilled, IconFlagFilled, IconTrophyFilled } from '$lib/icons'
  import ChallengeDetailsHeader from './challenge-details-header.svelte'
  import ChallengeDetailsOverview from './challenge-details-overview.svelte'
  import ChallengeDetailsPodium from './challenge-details-podium.svelte'
  import ChallengeDetailsSolvesSelf from './challenge-details-solves-self.svelte'
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
</script>

{#if challenge}
  {#key challenge.id}
    <div class="@container/details flex h-full flex-col">
      <ChallengeDetailsHeader {challenge} {isSolved} />

      <Tabs.Root bind:value={tab} class="flex min-h-0 flex-1 flex-col">
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
                  <ChallengeDetailsSolves {challenge} bind:userVisibleInList={userVisible} />
                </div>
              {/snippet}
            </Tabs.Content>
          {/if}
        </div>
      </Tabs.Root>

      {#if challenge.hasFlag}
        <div class="bg-background-l2 flex flex-col gap-2 px-5 py-4">
          {#if tab === 'details'}
            <ChallengeDetailsPodium {challenge} {isSolved} />
          {:else if tab === 'solves' && !userVisible}
            <ChallengeDetailsSolvesSelf {challenge} />
          {/if}
          <ChallengeDetailsSubmit {challenge} {isSolved} {onSolve} />
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
