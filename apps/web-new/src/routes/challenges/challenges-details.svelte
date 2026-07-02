<!--
  Detail pane for the selected challenge. challenges.svelte remounts this per
  challenge via {#key challenge.id}, so `selectedTab` resets on every switch.

  Tab visibility: 'details' always; 'solves' for flag challenges; 'scores' for
  dynamic (KotH) challenges. Panels stay mounted inside the Tabs primitive, but
  each body is gated to the active tab so heavy tab content (solves/scores) only
  mounts when opened. Footer slots (podium/submit) sit below the tab body.
-->
<script lang="ts">
  import { ChallengeScoringKind, type Challenge } from '@rctf/types'
  import IconFlagFilled from '$lib/icons/icon-flag-filled.svelte'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import Tabs from '$lib/ui/tabs.svelte'
  import ChallengeDetailsHeader from './challenges-details-header.svelte'
  import ChallengeDetailsOverview from './challenges-details-overview.svelte'

  interface Props {
    challenge: Challenge | null
    isSolved: boolean
    onSolve: (challengeId: string) => void
  }

  let { challenge, isSolved, onSolve }: Props = $props()

  type TabItem = { value: string; label: string; count?: number }

  const isDynamic = $derived(challenge?.scoringKind === ChallengeScoringKind.DYNAMIC)

  // The count is challenge.solves for both extra tabs — a parity quirk from the
  // old UI, where the scores tab labels the solve total rather than feed size.
  const tabItems = $derived.by((): TabItem[] => {
    if (!challenge) return []
    const items: TabItem[] = [{ value: 'details', label: 'Details' }]
    if (challenge.hasFlag) {
      items.push({ value: 'solves', label: 'Solves', count: challenge.solves })
    } else if (isDynamic) {
      items.push({ value: 'scores', label: 'Scores', count: challenge.solves })
    }
    return items
  })

  let selectedTab = $state('details')

  // Fall back to 'details' whenever the selection is not valid for this
  // challenge (guards a stale pick if the tab set ever changes without remount).
  const activeTab = $derived(
    tabItems.some(item => item.value === selectedTab) ? selectedTab : 'details'
  )
</script>

{#if challenge}
  <challenge-details>
    <ChallengeDetailsHeader {challenge} {isSolved} />

    <details-tabs>
      <Tabs value={activeTab} onValueChange={value => (selectedTab = value)} tabs={tabItems}>
        {#snippet content({ value })}
          {#if value === activeTab && challenge}
            {#if value === 'details'}
              <ChallengeDetailsOverview {challenge} />
            {:else if value === 'solves'}
              <!-- U8: replace with the solves tab (challenge prop). -->
              <solves-tab-slot>Solve feed loads here.</solves-tab-slot>
            {:else if value === 'scores'}
              <!-- U11: replace with the scores tab (challenge prop). -->
              <scores-tab-slot>Score feed loads here.</scores-tab-slot>
            {/if}
          {/if}
        {/snippet}
      </Tabs>
    </details-tabs>

    {#if challenge.hasFlag}
      <details-footer>
        {#if activeTab === 'details'}
          <!-- U9: replace with the flag podium (challenge + isSolved props). -->
          <podium-slot>Podium loads here.</podium-slot>
        {/if}
        <!-- U7: replace with the flag submit bar (challenge + isSolved + onSolve props). -->
        <submit-slot>Flag submission loads here.</submit-slot>
      </details-footer>
    {:else if isDynamic && activeTab === 'details'}
      <details-footer>
        <!-- U9: replace with the dynamic podium (challenge prop). -->
        <podium-slot data-variant="dynamic">Podium loads here.</podium-slot>
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
  }

  challenge-details[data-empty] {
    align-items: center;
    justify-content: center;
  }

  details-tabs {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
  }

  /* Make the consumed Tabs primitive fill this region: keep the strip fixed and
     let the active panel be the scroll container. */
  details-tabs :global([data-part='root']) {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
  }

  details-tabs :global([data-part='list']) {
    padding-inline: var(--space-l);
  }

  details-tabs :global([data-part='content']:not([hidden])) {
    flex: 1;
    min-block-size: 0;
    overflow-y: auto;
  }

  solves-tab-slot,
  scores-tab-slot {
    display: block;
    padding: var(--space-s) var(--space-l);
    color: var(--foreground-l4);
    font-size: var(--step--1);
  }

  details-footer {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    gap: var(--space-s);
    padding: var(--space-s) var(--space-l) var(--space-l);
    border-block-start: 1px solid var(--border);
  }

  podium-slot,
  submit-slot {
    display: block;
    color: var(--foreground-l4);
    font-size: var(--step--1);
  }
</style>
