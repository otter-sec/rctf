<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import { captureElement } from '$lib/attachments/capture-element'
  import EdgeFades from '$lib/components/edge-fades.svelte'
  import { resolvePinnedEdge } from '$lib/components/pinned-self-row'
  import {
    createScrollGeometry,
    deriveSelfRowClip,
  } from '$lib/components/scroll-geometry.svelte'
  import { IconAwardFilled } from '$lib/icons'
  import {
    useChallengeSolvesInfinite,
    useChallengeSolvesSelf,
  } from '$lib/query/challenges'
  import { useClientConfig } from '$lib/query/config'
  import { useCurrentUser } from '$lib/query/user'
  import { toast } from '$lib/toast'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import type { Attachment } from 'svelte/attachments'
  import { rankVariant, solveTimeLabels } from '../model/solve-times'
  import ChallengeDetailsRow from './details-row.svelte'
  import ChallengeDetailsSolvesSelf from './solves-self.svelte'

  interface Props {
    challenge: Challenge
  }

  let { challenge }: Props = $props()

  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()
  const solvesQuery = useChallengeSolvesInfinite(
    () => challenge.id,
    () => challenge.solves
  )
  const selfQuery = useChallengeSolvesSelf(() => challenge.id)

  const revealAfterLoading = solvesQuery.isPending

  const currentUser = $derived(userQuery.data)
  const clientConfig = $derived(clientConfigQuery.data)
  const ctfStartTime = $derived(clientConfig?.startTime ?? 0)
  const showDivision = $derived(
    clientConfig ? Object.keys(clientConfig.divisions).length > 1 : true
  )

  const allSolves = $derived(
    solvesQuery.data?.pages.flatMap(page => page.solves) ?? []
  )
  const firstBloodTime = $derived(
    allSolves[0]?.createdAt ?? selfQuery.data?.solves[0]?.createdAt ?? 0
  )

  const currentUserSolve = $derived(
    currentUser
      ? currentUser.solves.find(solve => solve.id === challenge.id)
      : undefined
  )
  const mySolvePosition = $derived(selfQuery.data?.mySolvePosition ?? null)
  const userSolveIndex = $derived(
    currentUser
      ? allSolves.findIndex(solve => solve.userId === currentUser.id)
      : -1
  )

  let scrollRoot = $state<HTMLElement | null>(null)
  const captureScroll = captureElement<HTMLElement>(node => (scrollRoot = node))

  const geometry = createScrollGeometry(() => scrollRoot)

  let selfRowNode = $state<HTMLElement | null>(null)
  const captureSelfRow = captureElement<HTMLElement>(
    node => (selfRowNode = node)
  )
  const selfClip = deriveSelfRowClip(geometry, () => selfRowNode)

  const pinnedEdge = $derived(
    resolvePinnedEdge({
      hasSelf: !!currentUserSolve && mySolvePosition !== null,
      selfIndex: userSolveIndex === -1 ? null : userSolveIndex,
      viewportClip:
        selfClip.edge === 'top'
          ? 'above'
          : selfClip.edge === 'bottom'
            ? 'below'
            : 'visible',
      searchActive: false,
    })
  )

  const loadMore: Attachment<HTMLElement> = node => {
    const root = scrollRoot
    if (!root) return
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (
            entry.isIntersecting &&
            solvesQuery.hasNextPage &&
            !solvesQuery.isFetchingNextPage
          ) {
            solvesQuery.fetchNextPage()
          }
        }
      },
      { root, rootMargin: '200px 0px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }

  $effect(() => {
    if (solvesQuery.isError) {
      toast.error(solvesQuery.error?.message ?? 'Failed to load solves')
    }
  })
</script>

<solves>
  {#if solvesQuery.isPending}
    <solves-status><Spinner label="Loading solves" /></solves-status>
  {:else if challenge.solves === 0}
    <EmptyState
      icon={IconAwardFilled}
      title="No solves yet"
      subtitle="Be the first to solve this challenge!"
    />
  {:else}
    <solves-viewport
      data-reveal={revealAfterLoading || undefined}
      data-fade-scope
    >
      <solves-scroll {@attach captureScroll} data-fade-source tabindex="-1">
        <solves-list>
          {#each allSolves as solve, index (solve.id)}
            {@const rank = index + 1}
            {@const isCurrentUser = !!(
              currentUser && solve.userId === currentUser.id
            )}
            {@const labels = solveTimeLabels({
              createdAt: solve.createdAt,
              rank,
              ctfStartTime,
              firstBloodTime,
            })}
            <row-slot {@attach isCurrentUser && captureSelfRow}>
              <ChallengeDetailsRow
                variant={rankVariant(rank, isCurrentUser)}
                {rank}
                name={solve.userName}
                userId={solve.userId}
                avatarUrl={solve.userAvatarUrl}
                countryCode={solve.userCountryCode}
                globalPlace={solve.globalPlace}
                division={showDivision ? solve.division : null}
                divisionPlace={showDivision ? solve.divisionPlace : null}
                isSelf={isCurrentUser}
                primaryValue={labels.primary}
                secondaryValue={labels.secondary}
              />
            </row-slot>
          {/each}

          {#if solvesQuery.isFetchingNextPage}
            <solves-loading
              ><Spinner label="Loading more solves" /></solves-loading
            >
          {/if}

          <solves-sentinel {@attach loadMore}></solves-sentinel>
        </solves-list>
      </solves-scroll>

      {#if pinnedEdge && currentUserSolve && mySolvePosition !== null}
        <self-overlay data-edge={pinnedEdge}>
          <ChallengeDetailsSolvesSelf
            rank={mySolvePosition}
            createdAt={currentUserSolve.createdAt}
            {firstBloodTime}
            {ctfStartTime}
            {showDivision}
          />
        </self-overlay>
      {/if}

      <EdgeFades
        selfEdge={(currentUserSolve &&
          mySolvePosition !== null &&
          pinnedEdge) ||
          null}
      />
    </solves-viewport>
  {/if}
</solves>

<style>
  solves {
    display: flex;
    flex-direction: column;
    block-size: 100%;
    min-block-size: 0;
  }

  solves-status {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    font-size: var(--step-1);
    color: var(--foreground-l3);
  }

  solves-viewport {
    position: relative;
    flex: 1;
    min-block-size: 0;
  }

  solves-scroll {
    display: block;
    block-size: 100%;
    overflow-y: auto;
    overscroll-behavior: none;
    outline: none;
  }

  solves-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    padding: 1rem 1.25rem;
  }

  row-slot {
    display: block;
    content-visibility: auto;
    contain-intrinsic-size: auto 4rem;
  }

  solves-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    block-size: 4rem;
    font-size: var(--step-1);
    color: var(--foreground-l3);
  }

  solves-sentinel {
    display: block;
    block-size: 1px;
  }

  self-overlay {
    position: absolute;
    inset-inline: 0;
    z-index: 1;
    padding-inline: 1.25rem;
    pointer-events: none;
    background: var(--background-l2);

    &[data-edge='top'] {
      inset-block-start: 0;
      padding-block-start: 1rem;
      padding-block-end: var(--space-3xs);
    }

    &[data-edge='bottom'] {
      inset-block-end: 0;
      padding-block-start: var(--space-3xs);
    }

    :global(a) {
      pointer-events: auto;
    }
  }
</style>
