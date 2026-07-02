<!--
  Scores tab — dynamic (KotH) challenges. A cumulative-score graph sits above a
  plain paged ranked list (KTD-3), no virtualizer: every loaded row is in the DOM
  but marked `content-visibility: auto`, so off-screen rows skip paint and layout.
  An IntersectionObserver sentinel drives load-more; a second observer tracks the
  user's own row so a pinned copy can be shown whenever it scrolls out of view (or
  lives on a page that has not loaded yet). Each row carries a rank-movement
  chevron plus 'N pts' and the point-delta chip on the trailing edge.
-->
<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import IconChartAreaLineFilled from '$lib/icons/icon-chart-area-line-filled.svelte'
  import { useChallengeScores, useChallengeScoresInfinite } from '$lib/query/challenges'
  import { useClientConfig } from '$lib/query/config'
  import { useCurrentUser } from '$lib/query/user'
  import { toast } from '$lib/toast'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import type { Attachment } from 'svelte/attachments'
  import ChallengeDetailsRow from './challenges-details-row.svelte'
  import ChallengeDetailsScoresGraph from './challenges-details-scores-graph.svelte'
  import ChallengeDetailsScoresSelf from './challenges-details-scores-self.svelte'
  import ChallengePointDelta from './challenges-point-delta.svelte'
  import { computeRankDeltas } from './rank-delta'
  import { rankVariant } from './solve-times'

  interface Props {
    challenge: Challenge
  }

  let { challenge }: Props = $props()

  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()
  const scoresQuery = useChallengeScoresInfinite(() => challenge.id)
  // A limit-1 read carries the caller's own rank so a solver on an unloaded page
  // can still be pinned, without pulling their whole page.
  const selfQuery = useChallengeScores(
    () => challenge.id,
    () => ({ limit: 1, offset: 0 })
  )

  const currentUser = $derived(userQuery.data)
  const clientConfig = $derived(clientConfigQuery.data)
  const startTime = $derived(clientConfig?.startTime ?? 0)
  const endTime = $derived(clientConfig?.endTime ?? 0)
  const showDivision = $derived(
    clientConfig ? Object.keys(clientConfig.divisions).length > 1 : true
  )

  const allScores = $derived(scoresQuery.data?.pages.flatMap(page => page.scores) ?? [])
  const total = $derived(scoresQuery.data?.pages[0]?.total ?? 0)

  // The graph series are duplicated across pages; keep the first sighting of each
  // team id so the graph draws every team once.
  type GraphSeries = NonNullable<typeof scoresQuery.data>['pages'][number]['graph'][number]
  const graph = $derived.by(() => {
    const seen = new Set<string>()
    const series: GraphSeries[] = []
    for (const page of scoresQuery.data?.pages ?? []) {
      for (const entry of page.graph) {
        if (!seen.has(entry.id)) {
          seen.add(entry.id)
          series.push(entry)
        }
      }
    }
    return series
  })

  const rankDeltas = $derived(computeRankDeltas(allScores))

  const myPosition = $derived(selfQuery.data?.myPosition ?? null)
  const userScoreIndex = $derived(
    currentUser ? allScores.findIndex(score => score.userId === currentUser.id) : -1
  )
  const selfRankDelta = $derived(currentUser ? rankDeltas.get(currentUser.id) : undefined)

  // The scroll container, captured by an attachment so the observers below can
  // use it as their IntersectionObserver root.
  let scrollRoot = $state<HTMLElement | null>(null)
  // null = the user's real row is on screen; 'top'/'bottom' = the edge it left by.
  let selfRowEdge = $state<'top' | 'bottom' | null>(null)

  // Which edge to pin the self overlay to, decided by the self-position query —
  // not observation alone, so a scorer on an unloaded page still gets pinned.
  const pinnedEdge = $derived.by((): 'top' | 'bottom' | null => {
    if (myPosition === null || !currentUser) return null
    if (userScoreIndex === -1) return 'bottom'
    return selfRowEdge
  })

  const captureScroll: Attachment<HTMLElement> = node => {
    scrollRoot = node
    return () => {
      if (scrollRoot === node) scrollRoot = null
    }
  }

  // Fetch the next page as the sentinel nears the viewport.
  const loadMore: Attachment<HTMLElement> = node => {
    const root = scrollRoot
    if (!root) return
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting && scoresQuery.hasNextPage && !scoresQuery.isFetchingNextPage) {
            scoresQuery.fetchNextPage()
          }
        }
      },
      { root, rootMargin: '200px 0px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }

  // Attached only to the current user's row (via `isSelf && observeSelfRow`);
  // reports which edge the row left by so the overlay can pin to it.
  const observeSelfRow: Attachment<HTMLElement> = node => {
    const root = scrollRoot
    if (!root) return
    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0]
        if (!entry) return
        const rootBounds = entry.rootBounds
        if (entry.isIntersecting || !rootBounds) {
          selfRowEdge = null
          return
        }
        selfRowEdge = entry.boundingClientRect.top < rootBounds.top ? 'top' : 'bottom'
      },
      { root, threshold: 0 }
    )
    observer.observe(node)
    return () => {
      observer.disconnect()
      selfRowEdge = null
    }
  }

  $effect(() => {
    if (scoresQuery.isError) {
      toast.error(scoresQuery.error?.message ?? 'Failed to load scores')
    }
  })
</script>

<scores>
  {#if scoresQuery.isPending}
    <scores-status><Spinner label="Loading scores" /></scores-status>
  {:else if total === 0}
    <EmptyState
      icon={IconChartAreaLineFilled}
      title="No scores yet"
      subtitle="Scores appear here once the scoring feed publishes them."
    />
  {:else}
    <scores-graph>
      <ChallengeDetailsScoresGraph {graph} selfId={currentUser?.id ?? null} {startTime} {endTime} />
    </scores-graph>

    <scores-viewport>
      <scores-scroll {@attach captureScroll} tabindex="-1">
        <scores-list>
          {#each allScores as score, index (score.userId)}
            {@const rank = index + 1}
            {@const isSelf = !!(currentUser && score.userId === currentUser.id)}
            <row-slot {@attach isSelf && observeSelfRow}>
              <ChallengeDetailsRow
                variant={rankVariant(rank, isSelf)}
                {rank}
                name={score.userName}
                userId={score.userId}
                avatarUrl={score.userAvatarUrl}
                countryCode={score.userCountryCode}
                globalPlace={score.globalPlace}
                division={showDivision ? score.division : null}
                divisionPlace={showDivision ? score.divisionPlace : null}
                {isSelf}
              >
                {#snippet rankAccessory()}
                  <ChallengePointDelta delta={rankDeltas.get(score.userId)} variant="rank" />
                {/snippet}
                <score-points>{score.points.toLocaleString()} pts</score-points>
                <ChallengePointDelta delta={score.pointDelta} />
              </ChallengeDetailsRow>
            </row-slot>
          {/each}

          {#if scoresQuery.isFetchingNextPage}
            <scores-loading><Spinner label="Loading more scores" /></scores-loading>
          {/if}

          <scores-sentinel {@attach loadMore}></scores-sentinel>
        </scores-list>
      </scores-scroll>

      {#if pinnedEdge && myPosition !== null}
        <self-overlay data-edge={pinnedEdge}>
          <ChallengeDetailsScoresSelf
            {challenge}
            rank={myPosition}
            rankDelta={selfRankDelta}
            {showDivision}
          />
        </self-overlay>
      {/if}
    </scores-viewport>
  {/if}
</scores>

<style>
  scores {
    display: flex;
    flex-direction: column;
    block-size: 100%;
    min-block-size: 0;
  }

  scores-status {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    font-size: var(--step-1);
    color: var(--foreground-l3);
  }

  scores-graph {
    display: block;
    flex-shrink: 0;
    padding: 1rem 1.25rem 0;
  }

  scores-viewport {
    position: relative;
    flex: 1;
    min-block-size: 0;
  }

  scores-scroll {
    display: block;
    block-size: 100%;
    overflow-y: auto;
    outline: none;
  }

  scores-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    padding: 0.75rem 1.25rem 1rem;
  }

  row-slot {
    display: block;
    content-visibility: auto;
    contain-intrinsic-size: auto 68px;
  }

  score-points {
    font-size: 1.125rem;
    font-variant-numeric: tabular-nums;
    color: var(--foreground-l1);
    white-space: nowrap;

    @media (width >= 40rem) {
      font-size: 1.25rem;
    }
  }

  scores-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    block-size: 4rem;
    font-size: var(--step-1);
    color: var(--foreground-l3);
  }

  scores-sentinel {
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
  }

  self-overlay[data-edge='top'] {
    inset-block-start: 0;
    padding-block-end: var(--space-3xs);
  }

  self-overlay[data-edge='bottom'] {
    inset-block-end: 0;
    padding-block-start: var(--space-3xs);
  }

  self-overlay :global(a) {
    pointer-events: auto;
  }
</style>
