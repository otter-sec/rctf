<!--
  Detail pane for the selected challenge. challenges.svelte remounts this per
  challenge via {#key challenge.id}; the active tab is lifted to the parent so
  it persists across switches.

  Tab visibility: 'details' always; 'solves' for flag challenges; 'scores' for
  dynamic (KotH) challenges. Panels stay mounted inside the Tabs primitive, but
  each body is gated to the active tab so heavy tab content (solves/scores) only
  mounts when opened. Footer slots (podium/submit) sit below the tab body.
-->
<script lang="ts">
  import { ChallengeScoringKind, type Challenge } from '@rctf/types'
  import IconChartAreaLineFilled from '$lib/icons/icon-chart-area-line-filled.svelte'
  import IconFileInfoFilled from '$lib/icons/icon-file-info-filled.svelte'
  import IconFlagFilled from '$lib/icons/icon-flag-filled.svelte'
  import IconTrophyFilled from '$lib/icons/icon-trophy-filled.svelte'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import Tabs from '$lib/ui/tabs.svelte'
  import type { Component } from 'svelte'
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
    tab: string
    onTabChange: (tab: string) => void
  }

  let { challenge, isSolved, onSolve, tab, onTabChange }: Props = $props()

  type TabItem = { value: string; label: string; count?: number; icon?: Component }

  const isDynamic = $derived(challenge?.scoringKind === ChallengeScoringKind.DYNAMIC)

  // The count is challenge.solves for both extra tabs — a parity quirk from the
  // old UI, where the scores tab labels the solve total rather than feed size.
  const tabItems = $derived.by((): TabItem[] => {
    if (!challenge) return []
    const items: TabItem[] = [{ value: 'details', label: 'Details', icon: IconFileInfoFilled }]
    if (challenge.hasFlag) {
      items.push({
        value: 'solves',
        label: 'Solves',
        count: challenge.solves,
        icon: IconTrophyFilled,
      })
    } else if (isDynamic) {
      items.push({
        value: 'scores',
        label: 'Scores',
        count: challenge.solves,
        icon: IconChartAreaLineFilled,
      })
    }
    return items
  })

  // Fall back to 'details' whenever the lifted selection is not valid for this
  // challenge (e.g. 'scores' persisted from a dynamic challenge onto a flag one).
  const activeTab = $derived(tabItems.some(item => item.value === tab) ? tab : 'details')
</script>

{#if challenge}
  <challenge-details>
    <ChallengeDetailsHeader {challenge} {isSolved} />

    <details-tabs>
      <Tabs value={activeTab} onValueChange={onTabChange} tabs={tabItems}>
        {#snippet content({ value })}
          {#if value === activeTab && challenge}
            {#if value === 'details'}
              <ChallengeDetailsOverview {challenge} {onSolve} />
            {:else if value === 'solves'}
              <ChallengeDetailsSolves {challenge} />
            {:else if value === 'scores'}
              <ChallengeDetailsScores {challenge} />
            {/if}
          {/if}
        {/snippet}
      </Tabs>
    </details-tabs>

    {#if challenge.hasFlag}
      <details-footer>
        {#if activeTab === 'details'}
          <ChallengeDetailsPodium {challenge} {isSolved} />
        {/if}
        <ChallengeDetailsSubmit {challenge} {isSolved} {onSolve} />
      </details-footer>
    {:else if isDynamic && activeTab === 'details'}
      <details-footer>
        <ChallengeDetailsPodiumDynamic {challenge} />
      </details-footer>
    {/if}
  </challenge-details>
{:else}
  <challenge-details data-empty>
    <EmptyState
      icon={IconFlagFilled}
      title="Select a challenge"
      subtitle="Choose a challenge from the list to view details"
    />
  </challenge-details>
{/if}

<style>
  challenge-details {
    display: flex;
    flex-direction: column;
    inline-size: 100%;
    block-size: 100%;
    min-block-size: 0;

    &[data-empty] {
      align-items: center;
      justify-content: center;
    }
  }

  details-tabs {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;

    /* Make the consumed Tabs primitive fill this region: keep the strip fixed and
       let the active panel be the scroll container. data-scope guards matter:
       bare [data-part] would also hit every other Zag component rendered inside
       the panels (avatar/tooltip roots share the part names). */
    > :global([data-scope='tabs'][data-part='root']) {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-block-size: 0;
    }

    :global([data-scope='tabs'][data-part='list']) {
      padding-inline: 1.25rem;
    }

    :global([data-scope='tabs'][data-part='content']:not([hidden])) {
      flex: 1;
      min-block-size: 0;
      overflow-y: auto;
      background: var(--background-l2);
    }
  }

  details-footer {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    gap: 0.5rem;
    padding: 0.5rem 1.25rem 1rem;
    background: var(--background-l2);
  }
</style>
