<!--
  Solves tab — a plain paged list (KTD-3), no virtualizer. Every loaded row is in
  the DOM but marked `content-visibility: auto`, so off-screen rows skip paint and
  layout. An IntersectionObserver sentinel drives load-more; a second observer
  tracks the current user's own row so a pinned copy can be shown whenever it
  scrolls out of view (or lives on a page that has not loaded yet).
-->
<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import { captureElement } from '$lib/attachments/capture-element'
  import EdgeFades from '$lib/components/edge-fades.svelte'
  import { resolvePinnedEdge } from '$lib/components/pinned-self-row'
  import {
    createScrollGeometry,
    deriveEdgeFades,
    deriveSelfRowClip,
  } from '$lib/components/scroll-geometry.svelte'
  import IconAwardFilled from '$lib/icons/icon-award-filled.svelte'
  import { useChallengeSolvesInfinite, useChallengeSolvesSelf } from '$lib/query/challenges'
  import { useClientConfig } from '$lib/query/config'
  import { useCurrentUser } from '$lib/query/user'
  import { toast } from '$lib/toast'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import type { Attachment } from 'svelte/attachments'
  import ChallengeDetailsRow from './challenges-details-row.svelte'
  import ChallengeDetailsSolvesSelf from './challenges-details-solves-self.svelte'
  import { rankVariant, solveTimeLabels } from './solve-times'

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

  // Non-reactive read: true only when this mount actually starts behind the
  // spinner, so a warm-cache remount doesn't replay the reveal fade.
  const revealAfterLoading = solvesQuery.isPending

  const currentUser = $derived(userQuery.data)
  const clientConfig = $derived(clientConfigQuery.data)
  const ctfStartTime = $derived(clientConfig?.startTime ?? 0)
  const showDivision = $derived(
    clientConfig ? Object.keys(clientConfig.divisions).length > 1 : true
  )

  const allSolves = $derived(solvesQuery.data?.pages.flatMap(page => page.solves) ?? [])
  const firstBloodTime = $derived(
    allSolves[0]?.createdAt ?? selfQuery.data?.solves[0]?.createdAt ?? 0
  )

  const currentUserSolve = $derived(
    currentUser ? currentUser.solves.find(solve => solve.id === challenge.id) : undefined
  )
  const mySolvePosition = $derived(selfQuery.data?.mySolvePosition ?? null)
  const userSolveIndex = $derived(
    currentUser ? allSolves.findIndex(solve => solve.userId === currentUser.id) : -1
  )

  // The scroll container, captured by an attachment so scroll geometry and the
  // load-more observer below can use it.
  let scrollRoot = $state<HTMLElement | null>(null)
  const captureScroll = captureElement<HTMLElement>(node => (scrollRoot = node))

  const geometry = createScrollGeometry(() => scrollRoot)
  const fades = deriveEdgeFades(geometry)

  // The current user's real row, captured so the shared clip can read its
  // layout position.
  let selfRowNode = $state<HTMLElement | null>(null)
  const captureSelfRow = captureElement<HTMLElement>(node => (selfRowNode = node))
  const selfClip = deriveSelfRowClip(geometry, () => selfRowNode)

  // Which edge to pin the self overlay to, decided by the self-position query —
  // not geometry alone, so a solver on an unloaded page still gets pinned.
  // The plain paged list keeps every loaded row mounted, so a null
  // `selfRowEdge` always means the real row is on screen (`visible`).
  const pinnedEdge = $derived(
    resolvePinnedEdge({
      hasSelf: !!currentUserSolve && mySolvePosition !== null,
      selfIndex: userSolveIndex === -1 ? null : userSolveIndex,
      viewportClip:
        selfClip.edge === 'top' ? 'above' : selfClip.edge === 'bottom' ? 'below' : 'visible',
      searchActive: false,
    })
  )

  // Fetch the next page as the sentinel nears the viewport.
  const loadMore: Attachment<HTMLElement> = node => {
    const root = scrollRoot
    if (!root) return
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting && solvesQuery.hasNextPage && !solvesQuery.isFetchingNextPage) {
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
    <solves-viewport data-reveal={revealAfterLoading || undefined}>
      <solves-scroll {@attach captureScroll} tabindex="-1">
        <solves-list>
          {#each allSolves as solve, index (solve.id)}
            {@const rank = index + 1}
            {@const isCurrentUser = !!(currentUser && solve.userId === currentUser.id)}
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
            <solves-loading><Spinner label="Loading more solves" /></solves-loading>
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
        top={fades.top}
        bottom={fades.bottom}
        selfEdge={(currentUserSolve && mySolvePosition !== null && pinnedEdge) || null}
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
    outline: none;
  }

  solves-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    padding: 1rem 1.25rem;
  }

  /* The intrinsic estimate must equal the real slot height (a 4rem row; the
     4px row gap is the list's flex gap, outside the slot). An overestimate
     makes never-rendered slots taller than rendered ones, so positions shift
     as slots render/skip and scroll anchoring visibly nudges the list. */
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

  /* Pinned copy of the user's row, held over the top or bottom edge of the
     scroll viewport. Transparent to pointer events so scrolling and hovering the
     rows underneath still work, except the profile link stays clickable. */
  self-overlay {
    position: absolute;
    inset-inline: 0;
    z-index: 1;
    padding-inline: 1.25rem;
    pointer-events: none;
    background: var(--background-l2);

    /* The top pin keeps a 1rem breathing gap (matching the list's block
       padding) instead of sitting flush against the viewport edge; the gap is
       part of the overlay's opaque surface so rows scroll beneath it. */
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
