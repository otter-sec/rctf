<script lang="ts">
  import type { Challenge } from '$lib/api'
  import { IconFlagFilled, IconInfoCircle, IconTrophy } from '$lib/icons'
  import { EmptyState, Separator, Tabs } from '$lib/components'
  import ChallengeDetailsTab from './challenge-details-tab.svelte'
  import ChallengeFlagForm from './challenge-flag-form.svelte'
  import ChallengeHeader from './challenge-header.svelte'
  import ChallengeSolvesTab from './challenge-solves-tab.svelte'

  type Props = {
    challenge: Challenge | null
    isSolved: boolean
    onSolve: (challengeId: string) => void
  }

  let { challenge, isSolved, onSolve }: Props = $props()
</script>

{#if challenge}
  {#key challenge.id}
    <div class="flex h-full flex-col">
      <ChallengeHeader {challenge} {isSolved} />

      <Tabs.Root value="details" class="flex min-h-0 flex-1 flex-col">
        <div class="px-6 pt-4">
          <Tabs.List>
            <Tabs.Trigger value="details">
              <IconInfoCircle class="size-4" />
              Details
            </Tabs.Trigger>
            <Tabs.Trigger value="solves">
              <IconTrophy class="size-4" />
              Solves{challenge.solves !== null ? ` (${challenge.solves})` : ''}
            </Tabs.Trigger>
          </Tabs.List>
        </div>

        <Tabs.Content value="details" class="min-h-0 flex-1">
          <ChallengeDetailsTab {challenge} />
        </Tabs.Content>

        <Tabs.Content value="solves" class="min-h-0 flex-1">
          <ChallengeSolvesTab {challenge} />
        </Tabs.Content>
      </Tabs.Root>

      <Separator />

      <ChallengeFlagForm {challenge} {isSolved} {onSolve} />
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
