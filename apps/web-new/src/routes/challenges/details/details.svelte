<script lang="ts">
  import { ChallengeScoringKind, type Challenge } from '@rctf/types'
  import { captureElement } from '$lib/attachments/capture-element'
  import EdgeFades from '$lib/components/edge-fades.svelte'
  import { createScrollGeometry, deriveEdgeFades } from '$lib/components/scroll-geometry.svelte'
  import IconChartAreaLineFilled from '$lib/icons/icon-chart-area-line-filled.svelte'
  import IconFileInfoFilled from '$lib/icons/icon-file-info-filled.svelte'
  import IconFlagFilled from '$lib/icons/icon-flag-filled.svelte'
  import IconTrophyFilled from '$lib/icons/icon-trophy-filled.svelte'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import Tabs from '$lib/ui/tabs.svelte'
  import type { Component } from 'svelte'
  import ChallengeDetailsHeader from './details-header.svelte'
  import ChallengeDetailsOverview from './overview.svelte'
  import ChallengeDetailsPodiumDynamic from './podium-dynamic.svelte'
  import ChallengeDetailsPodium from './podium.svelte'
  import ChallengeDetailsScores from './scores.svelte'
  import ChallengeDetailsSolves from './solves.svelte'
  import ChallengeDetailsSubmit from './submit.svelte'

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

  const activeTab = $derived(tabItems.some(item => item.value === tab) ? tab : 'details')

  let detailsScroll = $state<HTMLElement | null>(null)
  const captureDetailsScroll = captureElement<HTMLElement>(node => (detailsScroll = node))
  const detailsGeometry = createScrollGeometry(() => detailsScroll)
  const detailsFades = deriveEdgeFades(detailsGeometry)
</script>

{#if challenge}
  <challenge-details>
    <ChallengeDetailsHeader {challenge} {isSolved} />

    <details-tabs>
      <Tabs value={activeTab} onValueChange={onTabChange} tabs={tabItems}>
        {#snippet content({ value })}
          {#if value === activeTab && challenge}
            {#if value === 'details'}
              <details-viewport>
                <details-scroll {@attach captureDetailsScroll} tabindex="-1">
                  <ChallengeDetailsOverview {challenge} {onSolve} />
                </details-scroll>
                <EdgeFades top={detailsFades.top} bottom={detailsFades.bottom} />
              </details-viewport>
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
      display: flex;
      flex: 1;
      flex-direction: column;
      min-block-size: 0;
      overflow: hidden;
      background: var(--background-l2);
    }
  }

  details-viewport {
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
  }

  details-scroll {
    display: block;
    flex: 1;
    min-block-size: 0;
    overflow-y: auto;
    outline: none;
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
